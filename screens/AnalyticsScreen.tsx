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
import { colors } from "../theme";
import { getAnalytics } from "../api";
import type { AnalyticsResponse, DayBucket, StackProps } from "../types";

const RANGES = [7, 14, 30];

export default function AnalyticsScreen({ navigation }: StackProps<"Analytics">) {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [days, setDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      const d = await getAnalytics(days);
      setData(d);
    } catch (e) {
      Alert.alert("Could not load analytics", (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const maxMinutes = data ? Math.max(60, ...data.byDay.map((d) => d.minutes)) : 60;
  const totalHrs = data ? (data.totalMinutes / 60).toFixed(1) : "0";
  const streak = data?.currentStreakDays ?? 0;
  const avgDuration = data?.averageSessionDuration ?? 0;
  const longest = data?.longestSessionMinutes ?? 0;

  const subjectEntries = data?.subjectBreakdown
    ? Object.entries(data.subjectBreakdown).sort((a, b) => b[1] - a[1])
    : [];

  const maxSubjectMins = subjectEntries.length > 0 ? subjectEntries[0][1] : 1;

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 50 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Analytics & Insights</Text>
        </View>
        <Text style={styles.sub}>Track your study habits, streaks, and performance breakdown.</Text>

        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeBtn, days === r && styles.rangeBtnActive]}
              onPress={() => setDays(r)}
            >
              <Text style={[styles.rangeText, days === r && styles.rangeTextActive]}>{r} Days</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Top Metrics Grid (2x2) */}
            <View style={styles.statGrid}>
              <BlurView intensity={28} tint="light" style={styles.statCard}>
                <Ionicons name="time-outline" size={20} color="#9fe6d4" />
                <Text style={styles.statValue}>{totalHrs}h</Text>
                <Text style={styles.statLabel}>Total Study Time</Text>
              </BlurView>

              <BlurView intensity={28} tint="light" style={styles.statCard}>
                <Ionicons name="flame-outline" size={20} color="#ff8c42" />
                <Text style={styles.statValue}>{streak} {streak === 1 ? "Day" : "Days"}</Text>
                <Text style={styles.statLabel}>Current Streak</Text>
              </BlurView>

              <BlurView intensity={28} tint="light" style={styles.statCard}>
                <Ionicons name="speedometer-outline" size={20} color="#60a5fa" />
                <Text style={styles.statValue}>{avgDuration}m</Text>
                <Text style={styles.statLabel}>Avg Session Length</Text>
              </BlurView>

              <BlurView intensity={28} tint="light" style={styles.statCard}>
                <Ionicons name="trophy-outline" size={20} color="#ffd166" />
                <Text style={styles.statValue}>{longest}m</Text>
                <Text style={styles.statLabel}>Longest Session</Text>
              </BlurView>
            </View>

            {/* Daily Minutes Bar Chart */}
            <BlurView intensity={26} tint="light" style={styles.sectionCard}>
              <Text style={styles.cardHeaderTitle}>Daily Study Time (Minutes)</Text>
              <View style={styles.chart}>
                {(data?.byDay ?? []).map((d: DayBucket, i: number) => {
                  const h = Math.max(6, Math.round((d.minutes / maxMinutes) * 110));
                  const dayNum = d.date.length >= 10 ? d.date.slice(8, 10) : String(i + 1);
                  return (
                    <View key={d.date} style={styles.col}>
                      <Text style={styles.colValue}>{d.minutes > 0 ? d.minutes : ""}</Text>
                      <View style={[styles.bar, { height: h, backgroundColor: d.minutes > 0 ? "#9fe6d4" : "rgba(255,255,255,0.2)" }]} />
                      <Text style={styles.colLabel}>{dayNum}</Text>
                    </View>
                  );
                })}
              </View>
            </BlurView>

            {/* Subject Breakdown Progress Bars */}
            <BlurView intensity={26} tint="light" style={styles.sectionCard}>
              <Text style={styles.cardHeaderTitle}>Subject Breakdown</Text>
              {subjectEntries.length === 0 ? (
                <Text style={styles.emptySubText}>No subject study sessions logged yet.</Text>
              ) : (
                subjectEntries.map(([subj, mins]) => {
                  const pct = Math.min(100, Math.round((mins / maxSubjectMins) * 100));
                  const hrs = (mins / 60).toFixed(1);
                  return (
                    <View key={subj} style={styles.subjectRow}>
                      <View style={styles.subjectLabelRow}>
                        <Text style={styles.subjectName}>{subj}</Text>
                        <Text style={styles.subjectMins}>{hrs}h ({mins} mins)</Text>
                      </View>
                      <View style={styles.subjectTrack}>
                        <View style={[styles.subjectFill, { width: `${pct}%` }]} />
                      </View>
                    </View>
                  );
                })
              )}
            </BlurView>

            {/* Performance Insights */}
            <BlurView intensity={26} tint="light" style={styles.sectionCard}>
              <View style={styles.insightHeaderRow}>
                <Ionicons name="sparkles" size={18} color="#ffd166" />
                <Text style={styles.cardHeaderTitle}>Performance Insights</Text>
              </View>
              {(!data?.insights || data.insights.length === 0) ? (
                <Text style={styles.emptySubText}>Keep completing timer sessions to unlock personalized habits!</Text>
              ) : (
                data.insights.map((insight, idx) => (
                  <View key={idx} style={styles.insightRow}>
                    <Ionicons name="checkmark-circle-outline" size={18} color="#9fe6d4" />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))
              )}
            </BlurView>
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 6 },
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 16 },
  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 18 },
  rangeBtn: {
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  rangeBtnActive: { backgroundColor: "#fff" },
  rangeText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  rangeTextActive: { color: "#0b6f8e" },

  /* Stat Grid */
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 16 },
  statCard: {
    width: "48%",
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    gap: 4,
  },
  statValue: { color: "#fff", fontSize: 22, fontWeight: "700" },
  statLabel: { color: "rgba(255,255,255,0.75)", fontSize: 12 },

  /* Section Cards */
  sectionCard: {
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    marginBottom: 16,
  },
  cardHeaderTitle: { color: "#fff", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  insightHeaderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 12 },

  /* Bar Chart */
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 130,
    paddingTop: 10,
  },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  colValue: { color: "rgba(255,255,255,0.85)", fontSize: 9, fontWeight: "600" },
  bar: { width: 14, borderRadius: 7 },
  colLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10 },

  /* Subject Breakdown */
  subjectRow: { marginBottom: 12 },
  subjectLabelRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  subjectName: { color: "#fff", fontSize: 13, fontWeight: "600" },
  subjectMins: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  subjectTrack: { height: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" },
  subjectFill: { height: "100%", backgroundColor: "#0b6f8e", borderRadius: 4 },
  emptySubText: { color: "rgba(255,255,255,0.6)", fontSize: 13, fontStyle: "italic" },

  /* Insights */
  insightRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 8 },
  insightText: { color: "rgba(255,255,255,0.9)", fontSize: 13, flex: 1, lineHeight: 18 },
});
