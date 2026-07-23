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
import { adminDashboardTutorDetail, adminMarkTutorPaid } from "../api";
import type { StackProps } from "../types";

export default function AdminTutorDetailScreen({ route, navigation }: StackProps<"AdminTutorDetail">) {
  const insets = useSafeAreaInsets();
  const { tutorId, tutorName } = route.params;

  const [detail, setDetail] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [paying, setPaying] = useState(false);

  const loadDetail = useCallback(async () => {
    try {
      const data = await adminDashboardTutorDetail(tutorId);
      setDetail(data);
    } catch (e) {
      Alert.alert("Error", "Could not fetch tutor details. " + (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tutorId]);

  useFocusEffect(
    useCallback(() => {
      loadDetail();
    }, [loadDetail])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadDetail();
  };

  const handleMarkPaid = () => {
    const date = new Date();
    const monthName = date.toLocaleString("default", { month: "long" });
    const year = date.getFullYear();
    const periodLabel = `${monthName} ${year}`;
    const amountStr = (detail?.unpaidBalance || 0).toFixed(2);

    Alert.alert(
      "Confirm Payout Record",
      `Record a payout of GH₵${amountStr} for ${tutorName || tutorId} (${periodLabel})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark as Paid",
          onPress: async () => {
            setPaying(true);
            try {
              const updated = await adminMarkTutorPaid(tutorId, periodLabel);
              setDetail(updated);
              Alert.alert("Success", `Payout of GH₵${amountStr} recorded for ${periodLabel}.`);
            } catch (e) {
              Alert.alert("Payout Error", (e as Error).message);
            } finally {
              setPaying(false);
            }
          },
        },
      ]
    );
  };

  const unpaidBalance = detail?.unpaidBalance || 0;
  const hasUnpaid = unpaidBalance > 0.01;

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
          <Text style={styles.title}>Tutor Payout Detail</Text>
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
        ) : !detail ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Text style={styles.emptyText}>Tutor details unavailable.</Text>
          </BlurView>
        ) : (
          <>
            <BlurView intensity={28} tint="light" style={styles.headerCard}>
              <View style={styles.avatar}>
                <Ionicons name="person" size={24} color="#0b6f8e" />
              </View>
              <Text style={styles.tutorName}>{detail.tutorName || tutorName || tutorId}</Text>
              <Text style={styles.tutorMeta}>
                {detail.completedSessions || 0} completed session(s)
              </Text>
            </BlurView>

            <View style={styles.gridContainer}>
              <BlurView intensity={26} tint="light" style={styles.card}>
                <Text style={styles.cardLabel}>Total Gross Revenue</Text>
                <Text style={styles.cardValue}>GH₵{(detail.totalGrossRevenue || 0).toFixed(2)}</Text>
              </BlurView>

              <BlurView intensity={26} tint="light" style={styles.card}>
                <Text style={styles.cardLabel}>Tutor Share (50%)</Text>
                <Text style={styles.cardValue}>GH₵{(detail.totalTutorEarnings || 0).toFixed(2)}</Text>
              </BlurView>

              <BlurView intensity={26} tint="light" style={styles.card}>
                <Text style={styles.cardLabel}>Platform Share (50%)</Text>
                <Text style={styles.cardValue}>GH₵{(detail.totalPlatformEarnings || 0).toFixed(2)}</Text>
              </BlurView>

              <BlurView intensity={26} tint="light" style={[styles.card, styles.unpaidCard]}>
                <Text style={styles.cardLabel}>Current Unpaid Balance</Text>
                <Text style={[styles.cardValue, { color: hasUnpaid ? "#ff7675" : "#2ecc71" }]}>
                  GH₵{unpaidBalance.toFixed(2)}
                </Text>
              </BlurView>
            </View>

            {hasUnpaid ? (
              <TouchableOpacity
                style={styles.payBtn}
                onPress={handleMarkPaid}
                disabled={paying}
                activeOpacity={0.85}
              >
                {paying ? (
                  <ActivityIndicator color="#0b6f8e" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={20} color="#0b6f8e" />
                    <Text style={styles.payBtnText}>Mark as Paid (Disburse GH₵{unpaidBalance.toFixed(2)})</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              <View style={styles.paidNotice}>
                <Ionicons name="checkmark-done-circle" size={20} color="#2ecc71" />
                <Text style={styles.paidNoticeText}>All earnings for this tutor have been paid out!</Text>
              </View>
            )}

            <Text style={styles.sectionTitle}>Payout History</Text>
            {(!detail.payouts || detail.payouts.length === 0) ? (
              <BlurView intensity={20} tint="light" style={styles.empty}>
                <Text style={styles.emptyText}>No historical payouts recorded yet.</Text>
              </BlurView>
            ) : (
              detail.payouts.map((payout: any) => (
                <BlurView key={payout.payoutId} intensity={24} tint="light" style={styles.historyCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.historyLabel}>{payout.periodLabel || "Monthly Payout"}</Text>
                    <Text style={styles.historyDate}>
                      {payout.paidAt ? new Date(payout.paidAt).toLocaleDateString() : ""}
                    </Text>
                  </View>
                  <Text style={styles.historyAmount}>
                    GH₵{Number(payout.amountPaid || 0).toFixed(2)}
                  </Text>
                </BlurView>
              ))
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
  headerCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  tutorName: { color: "#fff", fontSize: 20, fontWeight: "600" },
  tutorMeta: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  gridContainer: { gap: 10, marginBottom: 20 },
  card: {
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  unpaidCard: { borderColor: "rgba(255,118,117,0.5)" },
  cardLabel: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  cardValue: { color: "#fff", fontSize: 20, fontWeight: "700", marginTop: 4 },
  payBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    marginBottom: 24,
  },
  payBtnText: { color: "#0b6f8e", fontSize: 15, fontWeight: "700" },
  paidNotice: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "rgba(46,204,113,0.15)",
    borderWidth: 1,
    borderColor: "rgba(46,204,113,0.4)",
    borderRadius: 14,
    paddingVertical: 12,
    marginBottom: 24,
  },
  paidNoticeText: { color: "#fff", fontSize: 14, fontWeight: "600" },
  sectionTitle: { color: "rgba(255,255,255,0.9)", fontSize: 16, fontWeight: "600", marginBottom: 12 },
  empty: {
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  historyLabel: { color: "#fff", fontSize: 15, fontWeight: "600" },
  historyDate: { color: "rgba(255,255,255,0.75)", fontSize: 12, marginTop: 2 },
  historyAmount: { color: "#2ecc71", fontSize: 16, fontWeight: "700" },
});
