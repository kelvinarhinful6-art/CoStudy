import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { session, proStatus, proPlan, subscribePro, listTutors, bookTutor, listUsers } from "../api";
import type { Plan, TabProps, User } from "../types";

const HOUR_OPTIONS = [1, 2, 3];

export default function TutorsScreen() {
  const insets = useSafeAreaInsets();
  const [isPro, setIsPro] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [checking, setChecking] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [course, setCourse] = useState("");
  const [tutors, setTutors] = useState<string[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hoursByTutor, setHoursByTutor] = useState<Record<string, number>>({});
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadStatus = useCallback(async () => {
    try {
      const [s, p, users] = await Promise.all([proStatus(), proPlan(), listUsers()]);
      setIsPro(!!s.active);
      setPlan(p);
      const map: Record<string, User> = {};
      (Array.isArray(users) ? users : []).forEach((u: User) => {
        map[u.userId] = u;
      });
      setUsersById(map);
    } catch (e) {
      // ignore status load errors
    } finally {
      setChecking(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus])
  );
  const onRefresh = () => {
    setRefreshing(true);
    loadStatus();
  };

  const handleSubscribe = async () => {
    setSubscribing(true);
    try {
      await subscribePro();
      await loadStatus();
      Alert.alert("You are Pro", "Tutor access unlocked.");
    } catch (e) {
      Alert.alert("Upgrade failed", (e as Error).message);
    } finally {
      setSubscribing(false);
    }
  };

  const handleSearch = async () => {
    if (!course.trim()) {
      Alert.alert("Enter a course", "Type a course code like PHY101.");
      return;
    }
    setSearching(true);
    setSearched(true);
    try {
      const data = await listTutors(course.trim().toUpperCase());
      const meId = session.user ? session.user.userId : null;
      // Filter out yourself so you can't book your own sessions
      const filtered = (Array.isArray(data) ? data : []).filter((tutorId: string) => tutorId !== meId);
      setTutors(filtered);
    } catch (e) {
      setTutors([]);
      Alert.alert("Could not load tutors", (e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const setHours = (tutorId: string, h: number) => setHoursByTutor((m) => ({ ...m, [tutorId]: h }));

  const handleBook = async (tutorId: string) => {
    const hours = hoursByTutor[tutorId] || 1;
    const userInfo = usersById[tutorId];
    const displayName = userInfo ? userInfo.tutorDisplayName || userInfo.username : "Tutor";

    setBookingId(tutorId);
    try {
      const b = await bookTutor(tutorId, course.trim().toUpperCase(), hours);
      Alert.alert(
        "Booking confirmed",
        `${hours} hr with ${displayName}\nTotal: ${b.grossAmount} ${b.currency}\nStatus: ${b.status}`
      );
    } catch (e) {
      Alert.alert("Booking failed", (e as Error).message);
    } finally {
      setBookingId(null);
    }
  };

  if (checking) {
    return (
      <SkyBackground>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#fff" />
        </View>
      </SkyBackground>
    );
  }

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.title}>Find a tutor</Text>
        {!isPro ? (
          <BlurView intensity={30} tint="light" style={styles.paywall}>
            <Ionicons name="lock-closed" size={30} color="#fff" />
            <Text style={styles.paywallTitle}>Tutors are a Pro feature</Text>
            <Text style={styles.paywallSub}>
              Unlock unlimited tutor access, priority matching and an ad-free experience.
            </Text>
            {plan && (
              <Text style={styles.price}>
                {plan.price} {plan.currency} / {plan.months === 1 ? "month" : plan.months + " months"}
              </Text>
            )}
            <TouchableOpacity style={styles.button} onPress={handleSubscribe} disabled={subscribing} activeOpacity={0.85}>
              {subscribing ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Upgrade to Pro</Text>}
            </TouchableOpacity>
          </BlurView>
        ) : (
          <>
            <View style={styles.proBadge}>
              <Ionicons name="star" size={13} color="#0b6f8e" />
              <Text style={styles.proBadgeText}>Pro</Text>
            </View>
            <BlurView intensity={28} tint="light" style={styles.searchCard}>
              <View style={styles.inputRow}>
                <Ionicons name="book-outline" size={18} color="rgba(255,255,255,0.9)" />
                <TextInput
                  style={styles.input}
                  placeholder="Course code (e.g. PHY101)"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={course}
                  onChangeText={setCourse}
                  autoCapitalize="characters"
                />
              </View>
              <TouchableOpacity style={styles.button} onPress={handleSearch} disabled={searching} activeOpacity={0.85}>
                {searching ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Find tutors</Text>}
              </TouchableOpacity>
            </BlurView>
            {searched && !searching && tutors.length === 0 && (
              <BlurView intensity={20} tint="light" style={styles.empty}>
                <Ionicons name="school-outline" size={28} color="rgba(255,255,255,0.85)" />
                <Text style={styles.emptyText}>No tutors found for this course yet.</Text>
              </BlurView>
            )}
            {tutors.map((tutorId) => {
              const userInfo = usersById[tutorId];
              const displayName = userInfo ? userInfo.tutorDisplayName || userInfo.username : "Unknown Tutor";
              const email = userInfo ? userInfo.email : "";
              return (
                <BlurView key={tutorId} intensity={26} tint="light" style={styles.tutorCard}>
                  <View style={styles.tutorHead}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={20} color="#0b6f8e" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tutorName}>{displayName}</Text>
                      <Text style={styles.tutorCourse}>
                        {course.trim().toUpperCase()} {email ? `| ${email}` : ""}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.pickLabel}>Session length</Text>
                  <View style={styles.hoursRow}>
                    {HOUR_OPTIONS.map((h) => {
                      const sel = (hoursByTutor[tutorId] || 1) === h;
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[styles.hourChip, sel && styles.hourChipSel]}
                          onPress={() => setHours(tutorId, h)}
                        >
                          <Text style={[styles.hourText, sel && styles.hourTextSel]}>{h} hr</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => handleBook(tutorId)}
                    disabled={bookingId === tutorId}
                    activeOpacity={0.85}
                  >
                    {bookingId === tutorId ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.bookText}>Book session</Text>
                    )}
                  </TouchableOpacity>
                </BlurView>
              );
            })}
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "600", marginBottom: 16 },
  paywall: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  paywallTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 4 },
  paywallSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  price: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 6 },
  button: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    marginTop: 8,
    alignSelf: "stretch",
  },
  buttonText: { color: "#0b6f8e", fontWeight: "600", fontSize: 15 },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  proBadgeText: { color: "#0b6f8e", fontWeight: "700", fontSize: 12 },
  searchCard: {
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  input: { flex: 1, color: "#fff", fontSize: 14 },
  empty: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
  tutorCard: {
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tutorHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  tutorName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tutorCourse: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  pickLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 8 },
  hoursRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  hourChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  hourChipSel: { backgroundColor: "#fff" },
  hourText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  hourTextSel: { color: "#0b6f8e" },
  bookBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  bookText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
