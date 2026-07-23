/**
 * Lightweight in-memory chat activity store.
 * Tracks last-message timestamp and unread count per groupId.
 * Module-level so it survives navigation between screens.
 */

type Listener = () => void;

interface GroupActivity {
  lastMessageAt: number; // epoch ms
  unreadCount: number;
}

const activity: Record<string, GroupActivity> = {};
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((fn) => fn());
}

/** Subscribe to any activity change. Returns an unsubscribe function. */
export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

/** Called when a NEW incoming message arrives (from someone else). */
export function bumpActivity(groupId: string): void {
  const curr = activity[groupId] || { lastMessageAt: 0, unreadCount: 0 };
  activity[groupId] = { lastMessageAt: Date.now(), unreadCount: curr.unreadCount + 1 };
  notify();
}

/** Called when the user opens a chat — resets the unread counter. */
export function markRead(groupId: string): void {
  if (activity[groupId] && activity[groupId].unreadCount > 0) {
    activity[groupId] = { ...activity[groupId], unreadCount: 0 };
    notify();
  }
}

/** Get activity data for a specific group. */
export function getActivity(groupId: string): GroupActivity {
  return activity[groupId] || { lastMessageAt: 0, unreadCount: 0 };
}

/** Total unread messages across all groups (for the tab badge). */
export function getTotalUnread(): number {
  return Object.values(activity).reduce((sum, a) => sum + a.unreadCount, 0);
}

/** Sort a list of groups so most-recently-active groups appear first. */
export function sortByActivity<T extends { groupId: string }>(groups: T[]): T[] {
  return [...groups].sort((a, b) => {
    const aAt = activity[a.groupId]?.lastMessageAt ?? 0;
    const bAt = activity[b.groupId]?.lastMessageAt ?? 0;
    return bAt - aAt;
  });
}
