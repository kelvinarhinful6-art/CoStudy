import type { LocalFile, SessionData, User } from './types';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://172.20.10.2:8080';
export const session: SessionData = { token: null, user: null };

type RequestOptions = {
  method?: string;
  body?: unknown;
  auth?: boolean;
};

async function request(path: string, options: RequestOptions = {}): Promise<any> {
  const { method = 'GET', body, auth = false } = options;
  const headers: { [key: string]: string } = { 'Content-Type': 'application/json' };
  if (auth && session.token) headers['Authorization'] = `Bearer ${session.token}`;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (e) {
    throw new Error('Cannot reach the server. Check Wi-Fi and that the backend is running.');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data && data.message ? data.message : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

function myId(): string {
  return session.user ? session.user.userId : '';
}

export async function register(
  username: string,
  email: string,
  password: string,
  userType = 'STUDENT'
): Promise<any> {
  const data = await request('/api/auth/register', {
    method: 'POST',
    body: { username, email, password, userType },
  });
  session.token = data.accessToken;
  session.user = data.user as User;
  return data;
}

export async function login(usernameOrEmail: string, password: string): Promise<any> {
  const data = await request('/api/auth/login', {
    method: 'POST',
    body: { usernameOrEmail, password },
  });
  session.token = data.accessToken;
  session.user = data.user as User;
  return data;
}

export async function myGroups(): Promise<any> {
  return request(`/api/groups/mine?userId=${encodeURIComponent(myId())}`);
}

export async function createGroup(
  groupName: string,
  courseId: string,
  description = ''
): Promise<any> {
  return request('/api/groups', {
    method: 'POST',
    body: { groupName, courseId, createdBy: myId(), description },
  });
}

export async function joinGroup(groupId: string): Promise<any> {
  return request(`/api/groups/${groupId}/members`, {
    method: 'POST',
    body: { userId: myId(), username: session.user ? session.user.username : 'A new member' },
  });
}

export async function groupSuggestions(courseId: string): Promise<any> {
  return request(`/api/groups/suggestions?courseId=${encodeURIComponent(courseId)}`);
}

export async function proStatus(): Promise<any> {
  return request(`/api/subscriptions/${encodeURIComponent(myId())}`);
}

export async function proPlan(): Promise<any> {
  return request('/api/subscriptions/plan');
}

export async function subscribePro(): Promise<any> {
  return request('/api/subscriptions', { method: 'POST', body: { userId: myId() } });
}

export async function listTutors(courseId: string): Promise<any> {
  return request(
    `/api/tutors?courseId=${encodeURIComponent(courseId)}&userId=${encodeURIComponent(myId())}`
  );
}

export async function tutorReviews(tutorId: string): Promise<any> {
  return request(`/api/tutors/${encodeURIComponent(tutorId)}/reviews`);
}

export async function bookTutor(
  tutorId: string,
  courseId: string,
  hours: number
): Promise<any> {
  return request('/api/bookings', {
    method: 'POST',
    body: { studentId: myId(), tutorId, courseId, hours },
  });
}

export async function myBookings(): Promise<any> {
  return request(`/api/bookings?studentId=${encodeURIComponent(myId())}`);
}

export { request };

export async function cancelBooking(bookingId: string): Promise<any> {
  return request(`/api/bookings/${encodeURIComponent(bookingId)}/cancel`, { method: 'POST' });
}

// --- Become a Tutor (tutoring-service) ---
export async function applyTutor(courseId: string): Promise<any> {
  return request('/api/tutor-applications', { method: 'POST', body: { userId: myId(), courseId } });
}

export async function getApplication(appId: string): Promise<any> {
  return request(`/api/tutor-applications/${appId}`);
}

// Submit the application for admin review once documents have been uploaded.
export async function submitApplication(appId: string): Promise<any> {
  return request(`/api/tutor-applications/${appId}/submit`, { method: 'POST' });
}

export async function uploadDocument(appId: string, file: LocalFile): Promise<any> {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'proof',
    type: file.mimeType || 'application/octet-stream',
  } as any);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/tutor-applications/${appId}/upload`, {
      method: 'POST',
      body: form,
    });
  } catch (e) {
    throw new Error('Upload failed to reach the server.');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.message) ? data.message : `Upload failed (${res.status})`);
  return data;
}

// --- My tutor applications ---
export async function myApplications(): Promise<any> {
  return request(`/api/tutor-applications?userId=${encodeURIComponent(myId())}`);
}

// --- Admin: review queue + decisions ---
export async function adminQueue(status = 'UNDER_REVIEW'): Promise<any> {
  return request(`/api/admin/tutor-applications?status=${encodeURIComponent(status)}`);
}

export async function adminApprove(appId: string): Promise<any> {
  return request(`/api/admin/tutor-applications/${appId}/approve`, {
    method: 'PATCH',
    body: { adminId: myId(), notes: 'approved in app' },
  });
}

export async function adminDecline(appId: string): Promise<any> {
  return request(`/api/admin/tutor-applications/${appId}/decline`, {
    method: 'PATCH',
    body: { adminId: myId(), notes: 'declined in app' },
  });
}

// --- Group chat ---
// The WebSocket is proxied through the API gateway on the SAME host/port as the
// REST API, so the app only ever reaches one host (the one it already can: 8080).
// Override with EXPO_PUBLIC_WS_URL if needed (e.g. wss://host/ws).
function deriveWsUrl(): string {
  if (process.env.EXPO_PUBLIC_WS_URL) return process.env.EXPO_PUBLIC_WS_URL;
  return BASE_URL.replace(/^http:\/\//, 'ws://').replace(/^https:\/\//, 'wss://') + '/ws';
}
export const WS_URL = deriveWsUrl();

export async function groupMessages(groupId: string): Promise<any> {
  return request(`/api/groups/${encodeURIComponent(groupId)}/messages`);
}

// --- Find People + invites ---
export async function listUsers(): Promise<any> {
  return request('/api/auth/users');
}

// Best-effort display name: tutors show their tutoring name, everyone falls
// back to full name then username.
export function userName(
  u?: { userId?: string; username?: string; fullName?: string; tutorDisplayName?: string; userType?: string } | null
): string {
  if (!u) return "";
  if (u.userType === "TUTOR") return u.tutorDisplayName || u.fullName || u.username || "";
  return u.fullName || u.username || "";
}

export async function sendInvite(
  groupId: string,
  groupName: string,
  toUserId: string
): Promise<any> {
  return request('/api/invites', {
    method: 'POST',
    body: {
      groupId,
      groupName,
      fromUserId: myId(),
      fromUsername: session.user ? session.user.username : '',
      toUserId,
    },
  });
}

export async function myInvites(): Promise<any> {
  return request(`/api/invites?userId=${encodeURIComponent(myId())}`);
}

export async function acceptInvite(inviteId: string): Promise<any> {
  return request(`/api/invites/${inviteId}/accept`, {
    method: 'POST',
    body: { username: session.user ? session.user.username : 'A new member' },
  });
}

export async function declineInvite(inviteId: string): Promise<any> {
  return request(`/api/invites/${inviteId}/decline`, { method: 'POST' });
}

// --- Tutoring sessions ---
export async function tutorBookings(): Promise<any> {
  return request(`/api/bookings?tutorId=${encodeURIComponent(myId())}`);
}

export async function setZoomLink(bookingId: string, zoomLink: string): Promise<any> {
  return request(`/api/bookings/${bookingId}/link`, { method: 'PUT', body: { zoomLink } });
}

export async function startSession(bookingId: string): Promise<any> {
  return request(`/api/bookings/${bookingId}/start`, { method: 'POST' });
}

export async function endSession(bookingId: string): Promise<any> {
  return request(`/api/bookings/${bookingId}/end`, { method: 'POST' });
}

export async function getBooking(bookingId: string): Promise<any> {
  return request(`/api/bookings/${bookingId}`);
}

export async function updateProfile(
  fullName: string,
  program: string,
  age: number | null,
  yearOfStudy: number | null,
  _tutorDisplayName?: string
): Promise<any> {
  return request(`/api/auth/profile/${encodeURIComponent(myId())}`, {
    method: 'PUT',
    body: { fullName, program, age, yearOfStudy },
  });
}

// --- Group members / admin controls ---
export async function getGroupMembers(groupId: string): Promise<any> {
  return request(`/api/groups/${groupId}/members`);
}

export async function renameGroup(groupId: string, newName: string): Promise<any> {
  return request(`/api/groups/${groupId}/name`, {
    method: 'PATCH',
    body: { requestedBy: myId(), requestedByName: session.user ? session.user.username : 'Admin', newName },
  });
}

export async function kickMember(
  groupId: string,
  targetUserId: string,
  targetUsername: string
): Promise<any> {
  return request(`/api/groups/${groupId}/kick`, {
    method: 'POST',
    body: { requestedBy: myId(), targetUserId, targetUsername },
  });
}

export async function uploadChatFile(groupId: string, file: LocalFile): Promise<any> {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'file',
    type: file.mimeType || 'application/octet-stream',
  } as any);
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/groups/${groupId}/upload`, { method: 'POST', body: form });
  } catch (e) {
    throw new Error('Upload failed to reach the server.');
  }
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) throw new Error((data && data.message) ? data.message : `Upload failed (${res.status})`);
  return data;
}

export async function deleteChatMessage(groupId: string, messageId: string): Promise<any> {
  return request(
    `/api/groups/${groupId}/messages/${messageId}?requestedBy=${encodeURIComponent(myId())}`,
    { method: 'DELETE' }
  );
}

export async function clearChat(groupId: string): Promise<any> {
  return request(`/api/groups/${groupId}/messages?requestedBy=${encodeURIComponent(myId())}`, {
    method: 'DELETE',
  });
}

export async function leaveGroup(groupId: string): Promise<any> {
  return request(`/api/groups/${groupId}/leave`, {
    method: 'POST',
    body: { userId: myId(), username: session.user ? session.user.username : 'User' },
  });
}

export async function deleteGroup(groupId: string): Promise<any> {
  return request(`/api/groups/${groupId}?requestedBy=${encodeURIComponent(myId())}`, {
    method: 'DELETE',
  });
}

export async function editChatMessage(
  groupId: string,
  messageId: string,
  newBody: string
): Promise<any> {
  return request(`/api/groups/${groupId}/messages/${messageId}`, {
    method: 'PUT',
    body: { requestedBy: myId(), newBody },
  });
}

export async function deleteBooking(bookingId: string): Promise<any> {
  return request(`/api/bookings/${bookingId}`, { method: 'DELETE' });
}

// --- Study Planner & Timer ---
export async function getStudyTasks(): Promise<any> {
  return request(`/api/study/tasks?userId=${encodeURIComponent(myId())}`);
}

export async function createStudyTask(
  title: string,
  subject: string,
  deadline: string | null
): Promise<any> {
  return request('/api/study/tasks', {
    method: 'POST',
    body: { userId: myId(), title, subject, deadline },
  });
}

export async function toggleStudyTask(taskId: string): Promise<any> {
  return request(`/api/study/tasks/${taskId}/toggle`, { method: 'PUT' });
}

export async function deleteStudyTask(taskId: string): Promise<any> {
  return request(`/api/study/tasks/${taskId}`, { method: 'DELETE' });
}

export async function logStudySession(subject: string, minutes: number): Promise<any> {
  return request('/api/study/sessions', {
    method: 'POST',
    body: { userId: myId(), subject, minutes },
  });
}

export async function getStudySessions(): Promise<any> {
  return request(`/api/study/sessions?userId=${encodeURIComponent(myId())}`);
}

// --- Session Reviews & Ratings (tutoring-service) ---
export async function createReview(bookingId: string, rating: number, comment: string): Promise<any> {
  return request('/api/reviews', {
    method: 'POST',
    body: { bookingId, rating, comment },
  });
}

// --- Analytics Dashboard (learning-service study time) ---
export async function getAnalytics(days = 7): Promise<any> {
  return request(`/api/study/analytics?userId=${encodeURIComponent(myId())}&days=${days}`);
}

// --- Push Notifications (engagement-service) ---
export async function registerPushToken(userId: string, token: string, platform: string): Promise<any> {
  return request('/api/notifications/push-token', {
    method: 'POST',
    body: { userId, token, platform },
  });
}

export async function unregisterPushToken(token: string): Promise<any> {
  return request('/api/notifications/push-token', {
    method: 'DELETE',
    body: { token },
  });
}

export async function getNotifications(): Promise<any> {
  return request(`/api/notifications?userId=${encodeURIComponent(myId())}`);
}

export async function markNotificationRead(notificationId: string): Promise<any> {
  return request(`/api/notifications/${encodeURIComponent(notificationId)}/read`, { method: 'POST' });
}

export async function verifyEmail(email: string, code: string): Promise<any> {
  return request('/api/auth/verify', { method: 'POST', body: { email, code } });
}

export async function getQuestionFile(courseId: string): Promise<any> {
  return request(`/api/courses/${courseId}/question-file`);
}

export async function uploadQuestionFile(courseId: string, file: LocalFile): Promise<any> {
  const form = new FormData();
  form.append('file', {
    uri: file.uri,
    name: file.name || 'questions.pdf',
    type: file.mimeType || 'application/pdf',
  } as any);
  const res = await fetch(`${BASE_URL}/api/courses/${courseId}/question-file`, {
    method: 'POST',
    body: form,
  });
  const text = await res.text();
  return text ? JSON.parse(text) : null;
}

export async function deleteApplication(appId: string): Promise<any> {
  return request(`/api/tutor-applications/${appId}?userId=${encodeURIComponent(myId())}`, {
    method: 'DELETE',
  });
}

export async function resignApplication(appId: string): Promise<any> {
  return request(`/api/tutor-applications/${appId}/resign`, {
    method: 'POST',
    body: { userId: myId() },
  });
}
