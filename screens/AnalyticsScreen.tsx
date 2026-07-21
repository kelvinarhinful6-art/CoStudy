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
          <Text style={styles.title}>Productivity</Text>
        </View>
        <Text style={styles.sub}>Your study time over the last {days} days.</Text>

        <View style={styles.rangeRow}>
          {RANGES.map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.rangeBtn, days === r && styles.rangeBtnActive]}
              onPress={() => setDays(r)}
            >
              <Text style={[styles.rangeText, days === r && styles.rangeTextActive]}>{r}d</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 30 }} />
        ) : (
          <>
            <View style={styles.statRow}>
              <BlurView intensity={28} tint="light" style={styles.stat}>
                <Text style={styles.statLabel}>Study time</Text>
                <Text style={styles.statValue}>{totalHrs}h</Text>
              </BlurView>
              <BlurView intensity={28} tint="light" style={styles.stat}>
                <Text style={styles.statLabel}>Sessions</Text>
                <Text style={styles.statValue}>{data?.totalSessions ?? 0}</Text>
              </BlurView>
            </View>

            <BlurView intensity={26} tint="light" style={styles.chartCard}>
              <Text style={styles.chartTitle}>Minutes / day</Text>
              <View style={styles.chart}>
                {(data?.byDay ?? []).map((d: DayBucket, i: number) => {
                  const h = Math.max(4, Math.round((d.minutes / maxMinutes) * 110));
                  const dayNum = d.date.length >= 10 ? d.date.slice(8, 10) : String(i + 1);
                  return (
                    <View key={d.date} style={styles.col}>
                      <Text style={styles.colValue}>{d.minutes > 0 ? d.minutes : ""}</Text>
                      <View style={[styles.bar, { height: h }]} />
                      <Text style={styles.colLabel}>{dayNum}</Text>
                    </View>
                  );
                })}
              </View>
            </BlurView>

            <Text style={styles.tip}>
              Tip: log focus time from the Timer tab to grow your chart.
            </Text>
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 14 },
  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
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
  statRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  stat: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  statLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  statValue: { color: "#fff", fontSize: 26, fontWeight: "600", marginTop: 6 },
  chartCard: {
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  chartTitle: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 12 },
  chart: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    height: 140,
    paddingTop: 10,
  },
  col: { flex: 1, alignItems: "center", justifyContent: "flex-end", gap: 4 },
  colValue: { color: "rgba(255,255,255,0.8)", fontSize: 9 },
  bar: { width: 14, borderRadius: 7, backgroundColor: "#9fe6d4" },
  colLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10 },
  tip: { color: "rgba(255,255,255,0.6)", fontSize: 12, marginTop: 14, textAlign: "center" },
});
