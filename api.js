export const BASE_URL = "http://172.20.10.4:8080";
export const session = { token: null, user: null };

async function request(path, { method = "GET", body, auth = false } = {}) {
  const headers = { "Content-Type": "application/json" };
  if (auth && session.token) headers["Authorization"] = `Bearer ${session.token}`;
  let res;
  try {
    res = await fetch(`${BASE_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch (e) {
    throw new Error("Cannot reach the server. Check Wi-Fi and that the backend is running.");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data && data.message ? data.message : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

export async function register(username, email, password, userType = "STUDENT") {
  const data = await request("/api/auth/register", { method: "POST", body: { username, email, password, userType } });
  session.token = data.accessToken; session.user = data.user; return data;
}
export async function login(usernameOrEmail, password) {
  const data = await request("/api/auth/login", { method: "POST", body: { usernameOrEmail, password } });
  session.token = data.accessToken; session.user = data.user; return data;
}

function myId() { return session.user ? session.user.userId : ""; }

export async function myGroups() { return request(`/api/groups/mine?userId=${encodeURIComponent(myId())}`); }
export async function createGroup(groupName, courseId, description = "") {
  return request("/api/groups", { method: "POST", body: { groupName, courseId, createdBy: myId(), description } });
}
export async function joinGroup(groupId) {
  return request(`/api/groups/${groupId}/members`, { method: "POST", body: { userId: myId(), username: (session.user ? session.user.username : "") } });
}
export async function groupSuggestions(courseId) {
  return request(`/api/groups/suggestions?courseId=${encodeURIComponent(courseId)}`);
}

export async function proStatus() { return request(`/api/subscriptions/${encodeURIComponent(myId())}`); }
export async function proPlan() { return request("/api/subscriptions/plan"); }
export async function subscribePro() { return request("/api/subscriptions", { method: "POST", body: { userId: myId() } }); }

export async function listTutors(courseId) {
  return request(`/api/tutors?courseId=${encodeURIComponent(courseId)}&userId=${encodeURIComponent(myId())}`);
}
export async function tutorReviews(tutorId) { return request(`/api/tutors/${encodeURIComponent(tutorId)}/reviews`); }
export async function bookTutor(tutorId, courseId, hours) {
  return request("/api/bookings", { method: "POST", body: { studentId: myId(), tutorId, courseId, hours } });
}
export async function myBookings() { return request(`/api/bookings?studentId=${encodeURIComponent(myId())}`); }
export { request };

export async function cancelBooking(bookingId) {
  return request(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, { method: "POST" });
}

// --- Become a Tutor (tutoring-service) ---
export async function applyTutor(courseId) {
  return request("/api/tutor-applications", { method: "POST", body: { userId: myId(), courseId } });
}
export async function getApplication(appId) {
  return request(`/api/tutor-applications/${appId}`);
}
export async function getVettingQuestions(appId) {
  return request(`/api/tutor-applications/${appId}/questions`);
}
export async function submitAttempt(appId, answers) {
  return request(`/api/tutor-applications/${appId}/attempts`, { method: "POST", body: { answers } });
}
export async function uploadDocument(appId, file) {
  const form = new FormData();
  form.append("file", { uri: file.uri, name: file.name || "proof", type: file.mimeType || "application/octet-stream" });
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/tutor-applications/${appId}/upload`, { method: "POST", body: form });
  } catch (e) {
    throw new Error("Upload failed to reach the server.");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.message) ? data.message : `Upload failed (${res.status})`);
  return data;
}

// --- My tutor applications ---
export async function myApplications() {
  return request(`/api/tutor-applications?userId=${encodeURIComponent(myId())}`);
}

// --- Admin: review queue + decisions ---
export async function adminQueue(status = "UNDER_REVIEW") {
  return request(`/api/admin/tutor-applications?status=${encodeURIComponent(status)}`);
}
export async function adminApprove(appId) {
  return request(`/api/admin/tutor-applications/${appId}/approve`, { method: "PATCH", body: { adminId: myId(), notes: "approved in app" } });
}
export async function adminDecline(appId) {
  return request(`/api/admin/tutor-applications/${appId}/decline`, { method: "PATCH", body: { adminId: myId(), notes: "declined in app" } });
}

// --- Group chat ---
// Through the gateway first. If the live socket fails (gateway blocks WS),
// change WS_URL to the direct learning-service port: ws://172.20.10.4:8082/ws
export const WS_URL = "ws://172.20.10.4:8082/ws";

export async function groupMessages(groupId) {
  return request(`/api/groups/${encodeURIComponent(groupId)}/messages`);
}

// --- Find People + invites ---
export async function listUsers() {
  return request("/api/auth/users");
}
export async function sendInvite(groupId, groupName, toUserId) {
  return request("/api/invites", { method: "POST", body: {
    groupId, groupName, fromUserId: myId(),
    fromUsername: (session.user ? session.user.username : ""), toUserId
  }});
}
export async function myInvites() {
  return request(`/api/invites?userId=${encodeURIComponent(myId())}`);
}
export async function acceptInvite(inviteId) {
  return request(`/api/invites/${inviteId}/accept`, { method: "POST" });
}
export async function declineInvite(inviteId) {
  return request(`/api/invites/${inviteId}/decline`, { method: "POST" });
}

// --- Tutoring sessions ---
export async function tutorBookings() {
  return request(`/api/bookings?tutorId=${encodeURIComponent(myId())}`);
}
export async function setZoomLink(bookingId, zoomLink) {
  return request(`/api/bookings/${bookingId}/link`, { method: "PUT", body: { zoomLink } });
}
export async function startSession(bookingId) {
  return request(`/api/bookings/${bookingId}/start`, { method: "POST" });
}
export async function endSession(bookingId) {
  return request(`/api/bookings/${bookingId}/end`, { method: "POST" });
}
export async function getBooking(bookingId) {
  return request(`/api/bookings/${bookingId}`);
}

export async function updateProfile(fullName, program, age, yearOfStudy) {
  return request(`/api/auth/profile/${encodeURIComponent(myId())}`, {
    method: "PUT",
    body: { fullName, program, age, yearOfStudy }
  });
}
// --- Group members / admin controls ---
export async function getGroupMembers(groupId) {
  return request(`/api/groups/${groupId}/members`);
}
export async function renameGroup(groupId, newName) {
  return request(`/api/groups/${groupId}/name`, {
    method: "PATCH",
    body: { requestedBy: myId(), newName }
  });
}
export async function kickMember(groupId, targetUserId) {
  return request(`/api/groups/${groupId}/kick`, {
    method: "POST",
    body: { requestedBy: myId(), targetUserId }
  });
}
export async function uploadChatFile(groupId, file) {
  const form = new FormData();
  form.append("file", { uri: file.uri, name: file.name || "file", type: file.mimeType || "application/octet-stream" });
  let res;
  try {
    res = await fetch(`${BASE_URL}/api/groups/${groupId}/upload`, { method: "POST", body: form });
  } catch (e) {
    throw new Error("Upload failed to reach the server.");
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.message) ? data.message : `Upload failed (${res.status})`);
  return data;
}
export async function deleteChatMessage(groupId, messageId) {
  return request(`/api/groups/${groupId}/messages/${messageId}?requestedBy=${encodeURIComponent(myId())}`, {
    method: "DELETE"
  });
}