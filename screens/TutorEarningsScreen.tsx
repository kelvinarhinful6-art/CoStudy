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
  const [latestEarning, setLatestEarning] = useState(0);
  const [sessions, setSessions] = useState(0);
  const [currency, setCurrency] = useState("GHS");

  const load = useCallback(async () => {
    try {
      const tutorId = session.user ? session.user.userId : "";
      const data = await tutorEarnings(tutorId);
      setTotalEarnings(data.totalEarned ?? data.totalEarnings ?? 0);
      setLatestEarning(data.latestEarning ?? 0);
      setSessions(data.sessions ?? data.sessionCount ?? 0);
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
            {/* New Money Received FIRST */}
            <BlurView intensity={32} tint="light" style={styles.newMoneyCard}>
              <View style={styles.badgeRow}>
                <Ionicons name="sparkles" size={14} color="#22c55e" />
                <Text style={styles.badgeText}>New Money Received</Text>
              </View>
              <Text style={styles.newAmount}>+ {latestEarning.toFixed(2)} {currency}</Text>
              <Text style={styles.newSub}>Latest incoming payout from your recent session</Text>
            </BlurView>

            {/* Total Earned So Far */}
            <BlurView intensity={28} tint="light" style={styles.card}>
              <Ionicons name="cash-outline" size={28} color="#fff" />
              <Text style={styles.amount}>{totalEarnings.toFixed(2)} {currency}</Text>
              <Text style={styles.label}>Total earned so far</Text>
            </BlurView>

            {/* Completed Sessions */}
            <BlurView intensity={28} tint="light" style={styles.card}>
              <Ionicons name="school-outline" size={26} color="#fff" />
              <Text style={styles.amount}>{sessions}</Text>
              <Text style={styles.label}>Tutoring sessions completed</Text>
            </BlurView>

            <Text style={styles.note}>
              You earn 50% of each session fee. New income is updated right after each session completes.
            </Text>
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 24, fontWeight: "600", marginBottom: 16 },
  newMoneyCard: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "rgba(34, 197, 94, 0.45)",
    backgroundColor: "rgba(34, 197, 94, 0.12)",
  },
  badgeRow: { flexDirection: "row", alignItems: "center", gap: 6, backgroundColor: "rgba(34, 197, 94, 0.2)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { color: "#4ade80", fontSize: 12, fontWeight: "700" },
  newAmount: { color: "#4ade80", fontSize: 32, fontWeight: "800", marginVertical: 4 },
  newSub: { color: "rgba(255,255,255,0.85)", fontSize: 12, textAlign: "center" },
  card: {
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  amount: { color: "#fff", fontSize: 26, fontWeight: "700" },
  label: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  note: { color: "rgba(255,255,255,0.7)", fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 18 },
});
