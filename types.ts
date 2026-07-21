import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeNavigationProp, RouteProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { ComponentProps } from 'react';
import type { Ionicons } from '@expo/vector-icons';

/** Valid @expo/vector-icons Ionicons glyph names. */
export type IconName = ComponentProps<typeof Ionicons>['name'];

// ---------------------------------------------------------------------------
// Domain types (shapes returned by the backend). Most fields are optional and
// an index signature is added so dynamic access / spreading stays flexible.
// ---------------------------------------------------------------------------

export interface User {
  userId: string;
  username: string;
  email?: string;
  userType?: string;
  fullName?: string;
  program?: string;
  age?: number | null;
  yearOfStudy?: number | null;
  tutorDisplayName?: string;
  [key: string]: any;
}

export interface SessionData {
  token: string | null;
  user: User | null;
}

export interface Group {
  groupId: string;
  groupName: string;
  courseId?: string;
  memberCount?: number;
  [key: string]: any;
}

export interface Invite {
  inviteId: string;
  groupId?: string;
  groupName?: string;
  fromUserId?: string;
  fromUsername?: string;
  [key: string]: any;
}

export interface TutorApplication {
  applicationId: string;
  userId?: string;
  courseId?: string;
  status?: string;
  attemptsUsed?: number;
  documentRef?: string;
  registeredCourse?: boolean;
  [key: string]: any;
}

export interface Booking {
  bookingId: string;
  courseId?: string;
  hours?: number;
  grossAmount?: number;
  currency?: string;
  status?: string;
  tutorId?: string;
  studentId?: string;
  zoomLink?: string | null;
  [key: string]: any;
}

export interface ChatMessage {
  messageId?: string;
  senderId?: string;
  senderName?: string;
  body?: string | null;
  fileUrl?: string | null;
  fileName?: string | null;
  fileType?: string | null;
  replyToId?: string | null;
  replyToName?: string | null;
  replyToBody?: string | null;
  isSystem?: boolean;
  systemText?: string;
  clearAll?: boolean;
  deleted?: boolean;
  [key: string]: any;
}

export interface StudyTask {
  taskId: string;
  title?: string;
  subject?: string;
  deadline?: string;
  isCompleted?: boolean;
  [key: string]: any;
}

export interface StudySession {
  sessionId?: string;
  sessionDate?: string;
  durationMinutes?: number;
  [key: string]: any;
}

export interface Plan {
  price?: string;
  currency?: string;
  months?: number;
  [key: string]: any;
}

export interface Review {
  reviewId?: string;
  tutorId?: string;
  studentId?: string;
  courseId?: string;
  rating?: number;
  comment?: string;
  createdAt?: string;
  [key: string]: any;
}

export interface DayBucket {
  date: string;
  minutes: number;
  sessions: number;
}

export interface AnalyticsResponse {
  totalMinutes: number;
  totalSessions: number;
  byDay: DayBucket[];
}

export interface AppNotification {
  notificationId: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  createdAt: string;
  [key: string]: any;
}

export interface GroupMember {
  userId: string;
  isAdmin?: boolean;
  [key: string]: any;
}

/** A local file picked from the device (camera / gallery / document picker). */
export interface LocalFile {
  uri: string;
  name?: string;
  mimeType?: string;
  [key: string]: any;
}

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

export type RootStackParamList = {
  Login: undefined;
  Main: undefined;
  BecomeTutor: { appId?: string; courseId?: string };
  AdminReview: undefined;
  AdminVetting: undefined;
  StudyPlanner: undefined;
  StudyTimer: undefined;
  Chat: { groupId: string; groupName?: string };
  FindPeople: undefined;
  Invites: undefined;
  TutorSessions: undefined;
  SessionChat: { bookingId: string; title?: string };
  Review: { bookingId: string; tutorId: string; tutorName?: string };
  MySessions: undefined;
  Analytics: undefined;
  Notifications: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Groups: undefined;
  Planner: undefined;
  Tutors: undefined;
  Profile: undefined;
};

/** Navigation prop for a screen that lives inside the bottom tab navigator
 *  but may also navigate to screens in the parent stack navigator. */
export type TabNavProp<T extends keyof RootTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, T>,
  NativeStackNavigationProp<RootStackParamList>
>;

export type TabProps<T extends keyof RootTabParamList> = {
  navigation: TabNavProp<T>;
  route: RouteProp<RootTabParamList, T>;
};

export type StackProps<T extends keyof RootStackParamList> = NativeStackScreenProps<
  RootStackParamList,
  T
>;

// Re-export the raw screen-prop helpers in case a screen needs them directly.
export type { NativeStackScreenProps, BottomTabScreenProps };
