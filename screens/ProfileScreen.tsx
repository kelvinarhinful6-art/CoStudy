import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  TextInput,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { session, proStatus, myBookings, cancelBooking, myApplications, updateProfile, deleteBooking, listUsers, deleteApplication, resignApplication } from "../api";
import type { Booking, TabProps, TutorApplication, User } from "../types";

const STATUS_COLORS: Record<string, string> = {
  APPROVED: "#1f9d6b",
  UNDER_REVIEW: "#c98a1b",
  REJECTED: "#c0392b",
  AWAITING_DOCUMENTS: "#c98a1b",
  RESIGNED: "#777",
};

export default function ProfileScreen({ navigation }: TabProps<"Profile">) {
  const insets = useSafeAreaInsets();
  const user = (session.user ?? ({} as User)) as User;
  const isAdmin = (user.userType || "").toUpperCase() === "ADMIN";
  const [isPro, setIsPro] = useState(false);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [apps, setApps] = useState<TutorApplication[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cancelId, setCancelId] = useState<string | null>(null);

  const [editingProfile, setEditingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [fullName, setFullName] = useState(user.fullName || "");
  const [program, setProgram] = useState(user.program || "");
  const [age, setAge] = useState(user.age != null ? String(user.age) : "");
  const [yearOfStudy, setYearOfStudy] = useState(user.yearOfStudy != null ? String(user.yearOfStudy) : "");
  const [tutorDisplayName, setTutorDisplayName] = useState(user.tutorDisplayName || "");

  const load = useCallback(async () => {
    try {
      const [s, b, a, u] = await Promise.all([proStatus(), myBookings(), myApplications(), listUsers()]);
      setIsPro(!!s.active);
      setBookings(Array.isArray(b) ? b : []);
      setApps(Array.isArray(a) ? a : []);
      const map: Record<string, User> = {};
      (Array.isArray(u) ? u : []).forEach((usr: User) => {
        map[usr.userId] = usr;
      });
      setUsersById(map);
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const onWithdraw = (app: TutorApplication) => {
    Alert.alert(
      "Withdraw application",
      `Delete your ${app.courseId} application? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Withdraw",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteApplication(app.applicationId);
              await load();
            } catch (e) {
              Alert.alert("Could not withdraw", (e as Error).message);
            }
          },
        },
      ]
    );
  };

  const onResign = (app: TutorApplication) => {
    Alert.alert(
      "Resign as tutor",
      `Stop being a tutor for ${app.courseId}? You can re-apply later if you change your mind.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Resign",
          style: "destructive",
          onPress: async () => {
            try {
              await resignApplication(app.applicationId);
              await load();
            } catch (e) {
              Alert.alert("Could not resign", (e as Error).message);
            }
          },
        },
      ]
    );
  };

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );
  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const logout = () => {
    Alert.alert("Log out?", "Are you sure you want to log out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Yes, Log Out",
        style: "destructive",
        onPress: () => {
          session.token = null;
          session.user = null;
          (navigation.getParent() as any)?.replace("Login");
        },
      },
    ]);
  };

  const doCancel = (b: Booking) => {
    Alert.alert("Cancel session?", `Cancel your ${b.hours} hr session with this tutor?`, [
      { text: "Keep it", style: "cancel" },
      {
        text: "Cancel session",
        style: "destructive",
        onPress: async () => {
          setCancelId(b.bookingId);
          try {
            await cancelBooking(b.bookingId);
            await load();
            Alert.alert("Cancelled", "Your session was cancelled.");
          } catch (e) {
            Alert.alert("Could not cancel", (e as Error).message);
          } finally {
            setCancelId(null);
          }
        },
      },
    ]);
  };

  const canCancel = (status?: string) => {
    const s = (status || "").toUpperCase();
    return s !== "COMPLETED" && s !== "CANCELLED" && s !== "CANCELED";
  };
  const canDelete = (status?: string) => {
    const s = (status || "").toUpperCase();
    return s === "COMPLETED" || s === "CANCELLED" || s === "CANCELED";
  };

  const initial = (user.username || "?").charAt(0).toUpperCase();

  const saveProfile = async () => {
    setSavingProfile(true);
    try {
      const ageNum = age ? parseInt(age, 10) : null;
      const yearNum = yearOfStudy ? parseInt(yearOfStudy, 10) : null;
      const updated = await updateProfile(fullName, program, ageNum, yearNum, tutorDisplayName);
      session.user = { ...session.user, ...updated } as User;
      setEditingProfile(false);
    } catch (e) {
      Alert.alert("Could not save profile", (e as Error).message);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.title}>Profile</Text>

        <BlurView intensity={30} tint="light" style={styles.headCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.name}>{user.username || "Unknown"}</Text>
          <Text style={styles.email}>{user.email || ""}</Text>
          <View style={[styles.badge, isPro ? styles.badgePro : styles.badgeFree]}>
            <Ionicons name={isPro ? "star" : "person"} size={13} color={isPro ? "#0b6f8e" : "#fff"} />
            <Text style={[styles.badgeText, { color: isPro ? "#0b6f8e" : "#fff" }]}>
              {isPro ? "Pro member" : "Free member"}
            </Text>
          </View>
        </BlurView>

        <BlurView intensity={28} tint="light" style={styles.profileInfoCard}>
          <View style={styles.profileInfoHeader}>
            <Text style={styles.sectionLabelInline}>My details</Text>
            {!editingProfile && (
              <TouchableOpacity onPress={() => setEditingProfile(true)} activeOpacity={0.85}>
                <Ionicons name="create-outline" size={20} color="#fff" />
              </TouchableOpacity>
            )}
          </View>

          {editingProfile ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Full name"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={fullName}
                onChangeText={setFullName}
              />
              <TextInput
                style={styles.input}
                placeholder="Program (e.g. BSc Computer Science)"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={program}
                onChangeText={setProgram}
              />
              <TextInput
                style={styles.input}
                placeholder="Age"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={age}
                onChangeText={setAge}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Year of study"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={yearOfStudy}
                onChangeText={setYearOfStudy}
                keyboardType="number-pad"
              />
              <TextInput
                style={styles.input}
                placeholder="Tutor Display Name (optional)"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={tutorDisplayName}
                onChangeText={setTutorDisplayName}
              />
              <View style={{ flexDirection: "row", gap: 10, marginTop: 4 }}>
                <TouchableOpacity
                  style={[styles.profileBtn, styles.profileCancelBtn]}
                  onPress={() => setEditingProfile(false)}
                  disabled={savingProfile}
                >
                  <Text style={styles.profileBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.profileBtn, styles.profileSaveBtn]}
                  onPress={saveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? <ActivityIndicator color="#0b6f8e" /> : <Text style={[styles.profileBtnText, { color: "#0b6f8e" }]}>Save</Text>}
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.infoText}>{user.fullName || "Full name not set"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="book-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.infoText}>{user.program || "Program not set"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.infoText}>{user.age != null ? `${user.age} years old` : "Age not set"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="school-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.infoText}>{user.yearOfStudy != null ? `Year ${user.yearOfStudy}` : "Year not set"}</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="ribbon-outline" size={16} color="rgba(255,255,255,0.85)" />
                <Text style={styles.infoText}>{user.tutorDisplayName || "Tutor name not set"}</Text>
              </View>
            </>
          )}
        </BlurView>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("BecomeTutor", {})}>
          <BlurView intensity={28} tint="light" style={styles.actionCard}>
            <Ionicons name="school" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>Become a Tutor</Text>
              <Text style={styles.actionSub}>Apply, upload your assessment & documents</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </BlurView>
        </TouchableOpacity>

        <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("TutorSessions")}>
          <BlurView intensity={28} tint="light" style={styles.actionCard}>
            <Ionicons name="briefcase" size={22} color="#fff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.actionTitle}>My tutoring sessions</Text>
              <Text style={styles.actionSub}>Post Zoom links, start & message students</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
          </BlurView>
        </TouchableOpacity>

        {apps.some((a) => a.status === "APPROVED") && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("TutorEarnings")}>
            <BlurView intensity={28} tint="light" style={styles.actionCard}>
              <Ionicons name="cash" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>My Earnings</Text>
                <Text style={styles.actionSub}>See what you've made from tutoring sessions</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </BlurView>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("AdminRevenue")}>
            <BlurView intensity={28} tint="light" style={styles.actionCard}>
              <Ionicons name="trending-up" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Total App Revenue</Text>
                <Text style={styles.actionSub}>Tutoring + Pro subscription revenue this year</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </BlurView>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("AdminReview")}>
            <BlurView intensity={28} tint="light" style={styles.actionCard}>
              <Ionicons name="shield-checkmark" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Admin: Review applications</Text>
                <Text style={styles.actionSub}>Approve or decline tutor applicants</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </BlurView>
          </TouchableOpacity>
        )}

        {isAdmin && (
          <TouchableOpacity activeOpacity={0.85} onPress={() => navigation.navigate("AdminVetting")}>
            <BlurView intensity={28} tint="light" style={styles.actionCard}>
              <Ionicons name="help-circle" size={22} color="#fff" />
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>Admin: Subject Assessment</Text>
                <Text style={styles.actionSub}>Upload assessment PDF for a course</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="rgba(255,255,255,0.8)" />
            </BlurView>
          </TouchableOpacity>
        )}

        {apps.length > 0 && (
          <>
            <Text style={styles.sectionLabel}>My applications</Text>
            {apps.map((a) => (
              <BlurView key={a.applicationId} intensity={24} tint="light" style={styles.appCard}>
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    a.status === "AWAITING_DOCUMENTS"
                      ? navigation.navigate("BecomeTutor", { appId: a.applicationId, courseId: a.courseId })
                      : Alert.alert("Application Status", "Your application is currently: " + a.status?.replace("_", " "))
                  }
                >
                  <View style={{ flexDirection: "row", alignItems: "center" }}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.appCourse}>{a.courseId}</Text>
                      <Text style={styles.appMeta}>Attempts used: {a.attemptsUsed}</Text>
                    </View>
                    <View style={[styles.statusPill, { backgroundColor: STATUS_COLORS[a.status || ""] || "#777" }]}>
                      <Text style={styles.statusText}>{(a.status || "").replace("_", " ")}</Text>
                    </View>
                  </View>
                </TouchableOpacity>
                {(a.status === "AWAITING_DOCUMENTS" || a.status === "UNDER_REVIEW") && (
                  <TouchableOpacity style={styles.withdrawBtn} onPress={() => onWithdraw(a)} activeOpacity={0.85}>
                    <Ionicons name="trash-outline" size={16} color="#ff4d4d" />
                    <Text style={styles.withdrawText}>Withdraw application</Text>
                  </TouchableOpacity>
                )}
                {a.status === "APPROVED" && (
                  <TouchableOpacity style={styles.resignBtn} onPress={() => onResign(a)} activeOpacity={0.85}>
                    <Ionicons name="exit-outline" size={16} color="#ff4d4d" />
                    <Text style={styles.resignText}>Resign as tutor</Text>
                  </TouchableOpacity>
                )}
              </BlurView>
            ))}
          </>
        )}

        <Text style={styles.sectionLabel}>My bookings</Text>
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
        ) : bookings.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="calendar-outline" size={26} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No bookings yet.</Text>
          </BlurView>
        ) : (
          bookings.map((b) => {
            const tutorInfo = usersById[b.tutorId || ""];
            const tutorDisplayName = tutorInfo ? tutorInfo.tutorDisplayName || tutorInfo.username : "Tutor";
            return (
              <BlurView key={b.bookingId} intensity={24} tint="light" style={styles.bookCard}>
                <View style={styles.bookTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.bookTutor}>{tutorDisplayName}</Text>
                    <Text style={styles.bookMeta}>{b.courseId} | {b.hours} hr</Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.bookAmount}>{b.grossAmount} {b.currency}</Text>
                    <Text style={styles.bookStatus}>{b.status}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.msgTutorBtn}
                  onPress={() => navigation.navigate("SessionChat", { bookingId: b.bookingId, title: "Session: " + b.courseId })}
                  activeOpacity={0.85}
                >
                  <Ionicons name="chatbubbles-outline" size={15} color="#fff" />
                  <Text style={styles.msgTutorText}>Message tutor / join</Text>
                </TouchableOpacity>
                {canCancel(b.status) && (
                  <TouchableOpacity
                    style={styles.cancelBtn}
                    onPress={() => doCancel(b)}
                    disabled={cancelId === b.bookingId}
                    activeOpacity={0.85}
                  >
                    {cancelId === b.bookingId ? (
                      <ActivityIndicator color="#ffb4b4" />
                    ) : (
                      <>
                        <Ionicons name="close-circle-outline" size={16} color="#ffb4b4" />
                        <Text style={styles.cancelText}>Cancel session</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
                {canDelete(b.status) && (
                  <TouchableOpacity style={styles.deleteBtn} onPress={() => doDelete(b)} activeOpacity={0.85}>
                    <Ionicons name="trash-outline" size={16} color="#ff4d4d" />
                    <Text style={styles.deleteBtnText}>Delete booking</Text>
                  </TouchableOpacity>
                )}
              </BlurView>
            );
          })
        )}

        <TouchableOpacity style={styles.logoutBtn} onPress={logout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={18} color="#fff" />
          <Text style={styles.logoutText}>Log out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SkyBackground>
  );

  function doDelete(b: Booking) {
    Alert.alert("Delete booking?", "This will remove the booking from your list. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteBooking(b.bookingId);
            await load();
          } catch (e) {
            Alert.alert("Could not delete", (e as Error).message);
          }
        },
      },
    ]);
  }
}

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 24, fontWeight: "600", marginBottom: 16 },
  headCard: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  avatarText: { color: "#0b6f8e", fontSize: 26, fontWeight: "700" },
  name: { color: "#fff", fontSize: 20, fontWeight: "600" },
  email: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  badge: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, marginTop: 12 },
  badgePro: { backgroundColor: "#fff" },
  badgeFree: { backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.35)" },
  badgeText: { fontWeight: "600", fontSize: 12 },
  profileInfoCard: {
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  profileInfoHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 10 },
  sectionLabelInline: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600" },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  infoText: { color: "#fff", fontSize: 14 },
  input: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    marginBottom: 10,
  },
  profileBtn: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 10, borderRadius: 10 },
  profileCancelBtn: { backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  profileSaveBtn: { backgroundColor: "#fff" },
  profileBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  actionCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  actionTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  actionSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  sectionLabel: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600", marginBottom: 12, marginTop: 10 },
  appCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  appCourse: { color: "#fff", fontSize: 15, fontWeight: "600" },
  appMeta: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  statusPill: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  statusText: { color: "#fff", fontWeight: "700", fontSize: 11 },
  withdrawBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,77,77,0.5)",
    backgroundColor: "rgba(255,77,77,0.12)",
  },
  withdrawText: { color: "#ff4d4d", fontWeight: "600", fontSize: 13 },
  resignBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 10,
    borderRadius: 10,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: "rgba(255,77,77,0.5)",
    backgroundColor: "rgba(255,77,77,0.12)",
  },
  resignText: { color: "#ff4d4d", fontWeight: "600", fontSize: 13 },
  empty: {
    borderRadius: 16,
    padding: 22,
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  bookCard: {
    borderRadius: 14,
    padding: 14,
    overflow: "hidden",
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  bookTop: { flexDirection: "row", alignItems: "center" },
  bookTutor: { color: "#fff", fontSize: 15, fontWeight: "600" },
  bookMeta: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  bookAmount: { color: "#fff", fontSize: 14, fontWeight: "600" },
  bookStatus: { color: "rgba(255,255,255,0.8)", fontSize: 11, marginTop: 2 },
  cancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(255,80,80,0.12)",
    borderWidth: 1,
    borderColor: "rgba(255,140,140,0.45)",
  },
  cancelText: { color: "#ffb4b4", fontWeight: "600", fontSize: 13 },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 8,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(255,0,0,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,0,0,0.3)",
  },
  deleteBtnText: { color: "#ff4d4d", fontWeight: "600", fontSize: 13 },
  msgTutorBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 12,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  msgTutorText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  logoutText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
