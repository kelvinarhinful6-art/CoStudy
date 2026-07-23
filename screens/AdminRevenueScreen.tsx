import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, RefreshControl } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { adminTutoringRevenue, adminProRevenue } from "../api";
import type { StackProps } from "../types";

export default function AdminRevenueScreen({ navigation }: StackProps<"AdminRevenue">) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tutoringSessions, setTutoringSessions] = useState(0);
  const [tutoringRevenue, setTutoringRevenue] = useState(0);
  const [latestCommission, setLatestCommission] = useState(0);
  const [currency, setCurrency] = useState("GHS");
  const [proTransactions, setProTransactions] = useState(0);
  const [proRevenueGhs, setProRevenueGhs] = useState(0);

  const load = useCallback(async () => {
    try {
      const [t, p] = await Promise.all([adminTutoringRevenue(), adminProRevenue()]);
      setTutoringSessions(t.sessions ?? 0);
      setTutoringRevenue(t.totalCommission ?? 0);
      setLatestCommission(t.latestCommission ?? 0);
      setCurrency(t.currency ?? "GHS");
      setProTransactions(p.transactionCount ?? 0);
      setProRevenueGhs((p.totalAmountKobo ?? 0) / 100);
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

  const total = tutoringRevenue + proRevenueGhs;

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.title}>Total App Revenue</Text>
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : (
          <>
            {/* New Revenue Received FIRST */}
            <BlurView intensity={32} tint="light" style={styles.newRevCard}>
              <View style={styles.badgeRow}>
                <Ionicons name="sparkles" size={14} color="#22c55e" />
                <Text style={styles.badgeText}>New Revenue Received</Text>
              </View>
              <Text style={styles.newAmount}>+ {latestCommission.toFixed(2)} {currency}</Text>
              <Text style={styles.newSub}>Latest incoming platform commission received</Text>
            </BlurView>

            {/* Total App Revenue */}
            <BlurView intensity={30} tint="light" style={styles.heroCard}>
              <Ionicons name="trending-up" size={28} color="#fff" />
              <Text style={styles.heroAmount}>{total.toFixed(2)} {currency}</Text>
              <Text style={styles.label}>Total app revenue so far</Text>
            </BlurView>

            <Text style={styles.sectionLabel}>Tutoring session revenue</Text>
            <BlurView intensity={26} tint="light" style={styles.card}>
              <Text style={styles.amount}>{tutoringRevenue.toFixed(2)} {currency}</Text>
              <Text style={styles.label}>{tutoringSessions} sessions completed (platform share)</Text>
            </BlurView>

            <Text style={styles.sectionLabel}>Pro feature revenue</Text>
            <BlurView intensity={26} tint="light" style={styles.card}>
              <Text style={styles.amount}>{proRevenueGhs.toFixed(2)} {currency}</Text>
              <Text style={styles.label}>{proTransactions} Pro subscriptions</Text>
            </BlurView>
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 24, fontWeight: "600", marginBottom: 16 },
  newRevCard: {
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
  heroCard: {
    borderRadius: 18,
    padding: 22,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  heroAmount: { color: "#fff", fontSize: 28, fontWeight: "700" },
  sectionLabel: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600", marginBottom: 10 },
  card: {
    borderRadius: 16,
    padding: 18,
    alignItems: "center",
    gap: 6,
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  amount: { color: "#fff", fontSize: 22, fontWeight: "700" },
  label: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
});
