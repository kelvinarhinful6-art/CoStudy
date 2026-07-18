$ErrorActionPreference = "Stop"
$base = "http://localhost:8080"
function POST($path, $bodyObj) { return Invoke-RestMethod -Method Post -Uri "$base$path" -ContentType "application/json" -Body ($bodyObj | ConvertTo-Json -Depth 6) }
function PATCHj($path, $bodyObj) { return Invoke-RestMethod -Method Patch -Uri "$base$path" -ContentType "application/json" -Body ($bodyObj | ConvertTo-Json -Depth 6) }
function PUTj($path, $bodyObj) { return Invoke-RestMethod -Method Put -Uri "$base$path" -ContentType "application/json" -Body ($bodyObj | ConvertTo-Json -Depth 6) }

Write-Host "1) Creating question set A for PHY101..."
$qset = @{ courseId = "PHY101"; setLabel = "A"; questions = @(
  @{ prompt="Unit of force?"; optionA="Watt"; optionB="Newton"; optionC="Joule"; optionD="Pascal"; correctOption="B" },
  @{ prompt="Speed = distance / ?"; optionA="time"; optionB="mass"; optionC="force"; optionD="area"; correctOption="A" }
)}
POST "/api/admin/question-sets" $qset | Out-Null

Write-Host "2) Tutor adjoa applies for PHY101..."
$app = POST "/api/tutor-applications" @{ userId="adjoa"; courseId="PHY101" }
$appId = $app.applicationId
Write-Host "   applicationId = $appId"

Write-Host "3) Fetching questions..."
$qs = Invoke-RestMethod -Uri "$base/api/tutor-applications/$appId/questions"
$forceId = ($qs.questions | Where-Object { $_.prompt -like "Unit of force*" }).questionId
$speedId = ($qs.questions | Where-Object { $_.prompt -like "Speed*" }).questionId

Write-Host "4) Submitting correct answers..."
$ans = @{ answers = @(@{ questionId=$forceId; chosenOption="B" }, @{ questionId=$speedId; chosenOption="A" }) }
POST "/api/tutor-applications/$appId/attempts" $ans | Out-Null

Write-Host "5) Admin approves..."
PATCHj "/api/admin/tutor-applications/$appId/approve" @{ adminId="me"; notes="ok" } | Out-Null

Write-Host "6) Setting hourly rate GHS 80..."
PUTj "/api/tutors/adjoa/rate" @{ courseId="PHY101"; hourlyRate=80 } | Out-Null

Write-Host ""
Write-Host "DONE. Tutor adjoa is approved and bookable for PHY101 at 80 GHS/hr."
