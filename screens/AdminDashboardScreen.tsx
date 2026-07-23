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
import { adminDashboardSummary, adminDashboardTutors } from "../api";
import type { StackProps } from "../types";

export default function AdminDashboardScreen({ navigation }: StackProps<"AdminDashboard">) {
  const insets = useSafeAreaInsets();
  const [summary, setSummary] = useState<any>(null);
  const [tutors, setTutors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [sumData, tutorList] = await Promise.all([
        adminDashboardSummary(),
        adminDashboardTutors(),
      ]);
      setSummary(sumData);
      setTutors(Array.isArray(tutorList) ? tutorList : []);
    } catch (e) {
      Alert.alert("Dashboard Error", "Failed to load dashboard data. " + (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 60 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Admin Dashboard</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Platform Financial Overview</Text>
            {summary && (
              <View style={styles.statsGrid}>
                <BlurView intensity={28} tint="light" style={styles.statCard}>
                  <Ionicons name="people" size={20} color="#fff" />
                  <Text style={styles.statVal}>{summary.totalTutors || 0} / {summary.totalStudents || 0}</Text>
                  <Text style={styles.statLbl}>Tutors / Students</Text>
                </BlurView>

                <BlurView intensity={28} tint="light" style={styles.statCard}>
                  <Ionicons name="checkmark-done-circle" size={20} color="#fff" />
                  <Text style={styles.statVal}>{summary.totalCompletedSessions || 0} / {summary.totalActiveBookings || 0}</Text>
                  <Text style={styles.statLbl}>Completed / Active</Text>
                </BlurView>

                <BlurView intensity={28} tint="light" style={styles.statCard}>
                  <Ionicons name="cash" size={20} color="#2ecc71" />
                  <Text style={styles.statVal}>GH₵{(summary.totalPlatformRevenue || 0).toFixed(2)}</Text>
                  <Text style={styles.statLbl}>Platform Rev (50%)</Text>
                </BlurView>

                <BlurView intensity={28} tint="light" style={styles.statCard}>
                  <Ionicons name="alert-circle" size={20} color="#e74c3c" />
                  <Text style={styles.statVal}>GH₵{(summary.totalTutorPayoutsPending || 0).toFixed(2)}</Text>
                  <Text style={styles.statLbl}>Pending Payouts</Text>
                </BlurView>

                <BlurView intensity={28} tint="light" style={styles.statCard}>
                  <Ionicons name="card" size={20} color="#f1c40f" />
                  <Text style={styles.statVal}>GH₵{(summary.totalTutorPayoutsCompleted || 0).toFixed(2)}</Text>
                  <Text style={styles.statLbl}>Completed Payouts</Text>
                </BlurView>

                <BlurView intensity={28} tint="light" style={styles.statCard}>
                  <Ionicons name="calendar-number" size={20} color="#fff" />
                  <Text style={styles.statVal}>GH₵{(summary.monthlyPlatformEarnings || 0).toFixed(2)}</Text>
                  <Text style={styles.statLbl}>This Month's Rev</Text>
                </BlurView>
              </View>
            )}

            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Tutors & Monthly Payouts</Text>
            {tutors.length === 0 ? (
              <BlurView intensity={20} tint="light" style={styles.empty}>
                <Ionicons name="school-outline" size={26} color="rgba(255,255,255,0.8)" />
                <Text style={styles.emptyText}>No tutor payout records found.</Text>
              </BlurView>
            ) : (
              tutors.map((item) => {
                const isPaid = item.payoutStatus === "Paid";
                const hasUnpaid = (item.unpaidBalance || 0) > 0;
                return (
                  <TouchableOpacity
                    key={item.tutorId}
                    activeOpacity={0.85}
                    onPress={() =>
                      navigation.navigate("AdminTutorDetail", {
                        tutorId: item.tutorId,
                        tutorName: item.tutorName,
                      })
                    }
                  >
                    <BlurView intensity={26} tint="light" style={styles.tutorCard}>
                      <View style={styles.tutorHeader}>
                        <View style={styles.avatar}>
                          <Text style={styles.avatarText}>
                            {(item.tutorName || "T").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.tutorName}>{item.tutorName || item.tutorId}</Text>
                          <Text style={styles.tutorMeta}>
                            {item.completedSessions || 0} completed session(s)
                          </Text>
                        </View>
                        <View
                          style={[
                            styles.statusBadge,
                            isPaid ? styles.badgePaid : styles.badgeUnpaid,
                          ]}
                        >
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isPaid ? { color: "#1f9d6b" } : { color: "#e74c3c" },
                            ]}
                          >
                            {item.payoutStatus}
                          </Text>
                        </View>
                      </View>

                      <View style={styles.divider} />

                      <View style={styles.tutorFinancials}>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.finLabel}>Total Earnings (50%)</Text>
                          <Text style={styles.finVal}>GH₵{(item.totalEarnings || 0).toFixed(2)}</Text>
                        </View>
                        <View style={{ flex: 1, alignItems: "flex-end" }}>
                          <Text style={styles.finLabel}>Unpaid Balance</Text>
                          <Text
                            style={[
                              styles.finVal,
                              hasUnpaid && { color: "#ff7675", fontWeight: "700" },
                            ]}
                          >
                            GH₵{(item.unpaidBalance || 0).toFixed(2)}
                          </Text>
                        </View>
                      </View>
                    </BlurView>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 20 },
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  sectionTitle: { color: "rgba(255,255,255,0.9)", fontSize: 16, fontWeight: "600", marginBottom: 12 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    gap: 4,
  },
  statVal: { color: "#fff", fontSize: 16, fontWeight: "700", marginTop: 4 },
  statLbl: { color: "rgba(255,255,255,0.8)", fontSize: 12 },
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
  tutorCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  tutorHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: { color: "#0b6f8e", fontSize: 18, fontWeight: "700" },
  tutorName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tutorMeta: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 1 },
  statusBadge: { borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  badgePaid: { backgroundColor: "#fff" },
  badgeUnpaid: { backgroundColor: "rgba(231,76,60,0.2)", borderWidth: 1, borderColor: "rgba(231,76,60,0.5)" },
  statusBadgeText: { fontWeight: "700", fontSize: 12 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.15)", marginVertical: 12 },
  tutorFinancials: { flexDirection: "row", justifyContent: "space-between" },
  finLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  finVal: { color: "#fff", fontSize: 14, fontWeight: "600", marginTop: 2 },
});
