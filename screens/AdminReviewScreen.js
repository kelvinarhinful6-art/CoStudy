import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { adminQueue, adminApprove, adminDecline } from "../api";

export default function AdminReviewScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await adminQueue("UNDER_REVIEW");
      setApps(Array.isArray(data) ? data : []);
    } catch (e) { Alert.alert("Could not load queue", e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const decide = (app, approve) => {
    Alert.alert(approve ? "Approve applicant?" : "Decline applicant?", `${app.userId} for ${app.courseId}`, [
      { text: "Cancel", style: "cancel" },
      { text: approve ? "Approve" : "Decline", style: approve ? "default" : "destructive", onPress: async () => {
        setActingId(app.applicationId);
        try {
          if (approve) await adminApprove(app.applicationId); else await adminDecline(app.applicationId);
          await load();
          Alert.alert("Done", `${app.userId} ${approve ? "approved" : "declined"}.`);
        } catch (e) { Alert.alert("Action failed", e.message); }
        finally { setActingId(null); }
      }},
    ]);
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color="#fff" /></TouchableOpacity>
          <Text style={styles.title}>Review applications</Text>
        </View>
        <Text style={styles.sub}>Applicants who passed the test and are waiting for a decision.</Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : apps.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="checkmark-done" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No applications waiting for review.</Text>
          </BlurView>
        ) : (
          apps.map((a) => (
            <BlurView key={a.applicationId} intensity={26} tint="light" style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.avatar}><Ionicons name="person" size={18} color="#0b6f8e" /></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.applicant}>{a.userId}</Text>
                  <Text style={styles.meta}>{a.courseId} | attempts: {a.attemptsUsed}</Text>
                </View>
              </View>
              <View style={styles.docRow}>
                <Ionicons name="document-attach-outline" size={15} color="rgba(255,255,255,0.85)" />
                <Text style={styles.docText}>{a.documentRef ? a.documentRef : "No document uploaded"}</Text>
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.decideBtn, styles.declineBtn]} onPress={() => decide(a, false)} disabled={actingId === a.applicationId} activeOpacity={0.85}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.decideBtn, styles.approveBtn]} onPress={() => decide(a, true)} disabled={actingId === a.applicationId} activeOpacity={0.85}>
                  {actingId === a.applicationId ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.approveText}>Approve</Text>}
                </TouchableOpacity>
              </View>
            </BlurView>
          ))
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 18 },
  empty: { borderRadius: 16, padding: 24, alignItems: "center", gap: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
  card: { borderRadius: 18, padding: 16, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  applicant: { color: "#fff", fontSize: 16, fontWeight: "600" },
  meta: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  docRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 14 },
  docText: { color: "rgba(255,255,255,0.85)", fontSize: 12, flex: 1 },
  btnRow: { flexDirection: "row", gap: 10 },
  decideBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 44 },
  declineBtn: { backgroundColor: "rgba(255,80,80,0.14)", borderWidth: 1, borderColor: "rgba(255,140,140,0.5)" },
  declineText: { color: "#ffb4b4", fontWeight: "600", fontSize: 14 },
  approveBtn: { backgroundColor: "#fff" },
  approveText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
});
