#!/usr/bin/env bash
# Smoke test for StudySync backend: reproduces the invite -> accept flow and
# asserts NO cloned group, plus checks analytics, reviews, and the WS endpoint.
set -u
BASE=http://localhost:8080
WS=http://localhost:8082/ws
# Unique per-run suffix so stale data persisted in the DB volume can never
# block the flow (apply() correctly rejects duplicate in-progress apps).
RUN=$$

jget () { node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{const f=process.argv[process.argv.length-1];console.log(JSON.parse(s)[f]||"")}catch(e){console.log("")}})' "$@"; }

echo "== Waiting for gateway health =="
for i in $(seq 1 30); do
  curl -s -o /dev/null -w "%{http_code}" $BASE/actuator/health | grep -q 200 && break
  sleep 2
done
curl -s $BASE/actuator/health; echo

echo; echo "== Register user A (ama) =="
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"ama","email":"ama@example.com","password":"secret12","userType":"STUDENT"}' > /tmp/a.json
AID=$(cat /tmp/a.json | jget accessToken)
AUSER=$(cat /tmp/a.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).user.userId)}catch(e){console.log("")}})')
echo "A id=$AUSER token_len=${#AID}"

echo; echo "== Register user B (kw) =="
curl -s -X POST $BASE/api/auth/register -H 'Content-Type: application/json' \
  -d '{"username":"kw","email":"kw@example.com","password":"secret12","userType":"STUDENT"}' > /tmp/b.json
BID=$(cat /tmp/b.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).user.userId)}catch(e){console.log("")}})')
echo "B id=$BID"

echo; echo "== A creates a group =="
curl -s -X POST $BASE/api/groups -H 'Content-Type: application/json' \
  -d "{\"groupName\":\"CS101 Study\",\"courseId\":\"CS101\",\"createdBy\":\"$AUSER\",\"description\":\"x\"}" > /tmp/g.json
GID=$(cat /tmp/g.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).groupId)}catch(e){console.log("")}})')
echo "Group id=$GID"

echo; echo "== A invites B (twice -> should NOT create duplicate pending) =="
curl -s -X POST $BASE/api/invites -H 'Content-Type: application/json' \
  -d "{\"groupId\":\"$GID\",\"groupName\":\"CS101 Study\",\"fromUserId\":\"$AUSER\",\"fromUsername\":\"ama\",\"toUserId\":\"$BID\"}" >/dev/null
curl -s -X POST $BASE/api/invites -H 'Content-Type: application/json' \
  -d "{\"groupId\":\"$GID\",\"groupName\":\"CS101 Study\",\"fromUserId\":\"$AUSER\",\"fromUsername\":\"ama\",\"toUserId\":\"$BID\"}" >/tmp/dup.json
echo "Second invite response (expect error about already invited):"
cat /tmp/dup.json; echo

echo; echo "== B lists invites =="
curl -s "$BASE/api/invites?userId=$BID" > /tmp/inv.json
IID=$(cat /tmp/inv.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s)[0].inviteId)}catch(e){console.log("")}})')
echo "Invite id=$IID"

echo; echo "== B accepts invite TWICE (idempotency / no clone) =="
curl -s -o /dev/null -w "accept1=%{http_code}\n" -X POST $BASE/api/invites/$IID/accept -H 'Content-Type: application/json' -d "{\"username\":\"kw\"}"
curl -s -o /dev/null -w "accept2=%{http_code}\n" -X POST $BASE/api/invites/$IID/accept -H 'Content-Type: application/json' -d "{\"username\":\"kw\"}"

echo; echo "== B's groups (expect exactly ONE) =="
curl -s "$BASE/api/groups/mine?userId=$BID" > /tmp/bg.json
cat /tmp/bg.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{let a=JSON.parse(s);console.log("group count =",a.length);a.forEach(g=>console.log("  -",g.groupId,g.groupName))})'

echo; echo "== Analytics endpoint (B) =="
curl -s "$BASE/api/study/analytics?userId=$BID&days=7"; echo

echo; echo "== Reviews endpoint (expect blocked: no completed session) =="
curl -s -o /dev/null -w "reviews=%{http_code}\n" -X POST $BASE/api/reviews -H 'Content-Type: application/json' -d "{\"bookingId\":\"00000000-0000-0000-0000-000000000000\",\"rating\":5,\"comment\":\"test\"}"

echo; echo "== WS handshake endpoint (expect 400 'Can Upgrade only' = endpoint is up) =="
curl -s -i $WS 2>&1 | head -3

echo; echo "== Tutor application: documents-only flow =="
USER="applicant$RUN"
COURSE="SUB$RUN"
echo "-- Admin uploads ${COURSE} assessment PDF --"
printf '%%PDF-1.4\nSample %s assessment.\n' "$COURSE" > /tmp/assessment.pdf
curl -s -o /dev/null -w "upload_qfile=%{http_code}\n" -X POST "$BASE/api/courses/$COURSE/question-file" -F "file=@/tmp/assessment.pdf"
echo "-- Applicant fetches the assessment url --"
QURL=$(curl -s "$BASE/api/courses/$COURSE/question-file" | jget url)
echo "assessment url = $QURL"
echo "-- Download the assessment through the gateway (proves tutoring-uploads route) --"
curl -s -o /dev/null -w "download_pdf=%{http_code}\n" "$BASE$QURL"

echo "-- $USER applies for $COURSE (expect AWAITING_DOCUMENTS) --"
curl -s -X POST $BASE/api/tutor-applications -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$USER\",\"courseId\":\"$COURSE\"}" > /tmp/app.json
APPID=$(cat /tmp/app.json | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{try{console.log(JSON.parse(s).applicationId)}catch(e){console.log("")}})')
echo "applicationId=$APPID status=$(cat /tmp/app.json | jget status)"

echo "-- submit before upload (expect 400) --"
curl -s -o /dev/null -w "submit_no_docs=%{http_code}\n" -X POST $BASE/api/tutor-applications/$APPID/submit

echo "-- upload completed document (solved assessment + CV) --"
printf '%%PDF-1.4\nSolved answers + CV.\n' > /tmp/appdoc.pdf
curl -s -o /dev/null -w "upload_doc=%{http_code}\n" -X POST "$BASE/api/tutor-applications/$APPID/upload" -F "file=@/tmp/appdoc.pdf"

echo "-- submit for review (expect UNDER_REVIEW) --"
curl -s -X POST $BASE/api/tutor-applications/$APPID/submit > /tmp/sub.json
echo "status=$(cat /tmp/sub.json | jget status)"

echo "-- admin approves (expect APPROVED) --"
curl -s -X PATCH $BASE/api/admin/tutor-applications/$APPID/approve -H 'Content-Type: application/json' \
  -d "{\"adminId\":\"admin\",\"notes\":\"ok\"}" > /tmp/dec.json
echo "status=$(cat /tmp/dec.json | jget status)"

echo "-- removed quiz endpoints should be gone (expect 404/405) --"
curl -s -o /dev/null -w "old_attempts=%{http_code}\n" -X POST $BASE/api/tutor-applications/$APPID/attempts -H 'Content-Type: application/json' -d '{"answers":[]}'
curl -s -o /dev/null -w "old_admin_questions=%{http_code}\n" "$BASE/api/admin/questions"

echo; echo "DONE"
