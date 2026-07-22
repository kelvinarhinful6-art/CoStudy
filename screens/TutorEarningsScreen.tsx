import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { session, tutorEarnings } from "../api";
import type { StackProps } from "../types";

export default function TutorEarningsScreen({ navigation }: StackProps<"TutorEarnings">) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [totalEarnings, setTotalEarnings] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [currency, setCurrency] = useState("GHS");

  const load = useCallback(async () => {
    try {
      const tutorId = session.user ? session.user.userId : "";
      const data = await tutorEarnings(tutorId);
      setTotalEarnings(data.totalEarnings ?? 0);
      setSessions(data.sessionCount ?? 0);
      setCurrency(data.currency ?? "GHS");
    } catch (e) {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.title}>My Earnings</Text>
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : (
          <>
            <BlurView intensity={30} tint="light" style={styles.card}>
              <Ionicons name="cash-outline" size={32} color="#fff" />
              <Text style={styles.amount}>{totalEarnings.toFixed(2)} {currency}</Text>
              <Text style={styles.label}>Total earned so far</Text>
            </BlurView>
            <BlurView intensity={28} tint="light" style={styles.card}>
              <Ionicons name="school-outline" size={28} color="#fff" />
              <Text style={styles.amount}>{sessions}</Text>
              <Text style={styles.label}>Tutoring sessions completed</Text>
            </BlurView>
            <Text style={styles.note}>
              You earn half of each session's fee. Money is added to your total right after each session ends.
            </Text>
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 24, fontWeight: "600", marginBottom: 16 },
  card: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  amount: { color: "#fff", fontSize: 28, fontWeight: "700" },
  label: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  note: { color: "rgba(255,255,255,0.7)", fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 18 },
});
