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
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { session, myBookings, tutorReviews } from "../api";
import type { Booking, Review, StackProps } from "../types";

export default function MySessionsScreen({ navigation }: StackProps<"MySessions">) {
  const insets = useSafeAreaInsets();
  const me = (session.user ?? ({} as any)) as any;
  const [sessions, setSessions] = useState<Booking[]>([]);
  const [reviews, setReviews] = useState<Record<string, Review>>({}); // keyed by bookingId
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await myBookings();
      const list = Array.isArray(data) ? data : [];
      setSessions(list);
      // Determine which completed sessions the student has already reviewed.
      const reviewed: Record<string, Review> = {};
      await Promise.all(
        list
          .filter((s: Booking) => (s.status || "").toUpperCase() === "COMPLETED" && s.tutorId)
          .map(async (s: Booking) => {
            try {
              const rs: Review[] = await tutorReviews(s.tutorId as string);
              const mine = (Array.isArray(rs) ? rs : []).find(
                (r) => r.bookingId === s.bookingId && r.studentId === me.userId
              );
              if (mine) reviewed[s.bookingId] = mine;
            } catch (e) {
              // ignore — review lookup is best-effort
            }
          })
      );
      setReviews(reviewed);
    } catch (e) {
      Alert.alert("Could not load sessions", (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [me.userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const openReview = (s: Booking) => {
    navigation.navigate("Review", { bookingId: s.bookingId, tutorId: s.tutorId ?? "", tutorName: s.tutorId });
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>My sessions</Text>
        </View>
        <Text style={styles.sub}>Review your tutors after a completed session.</Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : sessions.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="calendar-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No tutoring sessions yet.</Text>
          </BlurView>
        ) : (
          sessions.map((s) => {
            const completed = (s.status || "").toUpperCase() === "COMPLETED";
            const existing = reviews[s.bookingId];
            return (
              <BlurView key={s.bookingId} intensity={26} tint="light" style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.course}>{s.courseId} | {s.hours} hr</Text>
                    <Text style={styles.meta}>
                      {s.grossAmount} {s.currency} | {s.status}
                    </Text>
                  </View>
                </View>

                {completed &&
                  (existing ? (
                    <View style={styles.reviewedRow}>
                      <Ionicons name="checkmark-circle" size={16} color="#1f9d6b" />
                      <Text style={styles.reviewedText}>
                        Rated {existing.rating}/5{existing.comment ? ` — “${existing.comment}”` : ""}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      style={styles.reviewBtn}
                      onPress={() => openReview(s)}
                      activeOpacity={0.85}
                    >
                      <Ionicons name="star-outline" size={16} color="#0b6f8e" />
                      <Text style={styles.reviewText}>Leave a review</Text>
                    </TouchableOpacity>
                  ))}
              </BlurView>
            );
          })
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 18 },
  empty: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  card: {
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  course: { color: "#fff", fontSize: 16, fontWeight: "600" },
  meta: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  reviewedRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  reviewedText: { color: "#9fe6d4", fontSize: 13, flexShrink: 1 },
  reviewBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 12,
    backgroundColor: "#fff",
  },
  reviewText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
});
