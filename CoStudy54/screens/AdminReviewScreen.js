import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { WebView } from "react-native-webview";
import SkyBackground from "./SkyBackground";
import { BASE_URL, adminQueue, adminApprove, adminDecline, listUsers } from "../api";

export default function AdminReviewScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [apps, setApps] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState(null);
  const [viewingDoc, setViewingDoc] = useState(null);

  const load = useCallback(async () => {
    try {
      const [data, users] = await Promise.all([adminQueue("UNDER_REVIEW"), listUsers()]);
      setApps(Array.isArray(data) ? data : []);
      const map = {};
      (Array.isArray(users) ? users : []).forEach((u) => { map[u.userId] = u; });
      setUsersById(map);
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
          Alert.alert("Done", `Applicant ${approve ? "approved" : "declined"}.`);
        } catch (e) { Alert.alert("Action failed", e.message); }
        finally { setActingId(null); }
      }},
    ]);
  };

  const openDoc = (docRef) => {
    setViewingDoc(`${BASE_URL}/api/tutor-applications/documents/${docRef}`);
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
        <Text style={styles.sub}>Applicants waiting for a decision.</Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : apps.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="checkmark-done" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No applications waiting for review.</Text>
          </BlurView>
        ) : (
          apps.map((a) => {
            const userInfo = usersById[a.userId];
            const displayName = userInfo ? userInfo.username : "Unknown User";
            return (
              <BlurView key={a.applicationId} intensity={26} tint="light" style={styles.card}>
                <View style={styles.cardTop}>
                  <View style={styles.avatar}><Ionicons name="person" size={18} color="#0b6f8e" /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.applicant}>{displayName}</Text>
                    <Text style={styles.meta}>Course: {a.courseId}</Text>
                  </View>
                </View>
                
                {a.documentRef ? (
                  <TouchableOpacity style={styles.docRow} onPress={() => openDoc(a.documentRef)}>
                    <Ionicons name="document-attach-outline" size={18} color="#0b6f8e" />
                    <Text style={styles.docLink}>View Uploaded Document</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.docRow}>
                    <Ionicons name="document-attach-outline" size={15} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.docText}>No document uploaded</Text>
                  </View>
                )}

                <View style={styles.btnRow}>
                  <TouchableOpacity style={[styles.decideBtn, styles.declineBtn]} onPress={() => decide(a, false)} disabled={actingId === a.applicationId} activeOpacity={0.85}>
                    <Text style={styles.declineText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[styles.decideBtn, styles.approveBtn]} onPress={() => decide(a, true)} disabled={actingId === a.applicationId} activeOpacity={0.85}>
                    {actingId === a.applicationId ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.approveText}>Approve</Text>}
                  </TouchableOpacity>
                </View>
              </BlurView>
            );
          })
        )}
      </ScrollView>

      <Modal visible={!!viewingDoc} transparent={true} animationType="fade" onRequestClose={() => setViewingDoc(null)}>
        <View style={styles.fileViewerOverlay}>
          <View style={styles.fileViewerHeader}>
            <Text style={styles.fileViewerTitle}>Viewing Document</Text>
            <TouchableOpacity onPress={() => setViewingDoc(null)}>
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
          </View>
          {viewingDoc && <View style={styles.webviewContainer}><WebView source={{ uri: viewingDoc }} /></View>}
        </View>
      </Modal>
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
  docRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 14, backgroundColor: "rgba(255,255,255,0.1)", padding: 10, borderRadius: 8 },
  docText: { color: "rgba(255,255,255,0.85)", fontSize: 13, flex: 1 },
  docLink: { color: "#0b6f8e", fontSize: 14, fontWeight: "600", flex: 1 },
  btnRow: { flexDirection: "row", gap: 10 },
  decideBtn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 44 },
  declineBtn: { backgroundColor: "rgba(255,80,80,0.14)", borderWidth: 1, borderColor: "rgba(255,140,140,0.5)" },
  declineText: { color: "#ffb4b4", fontWeight: "600", fontSize: 14 },
  approveBtn: { backgroundColor: "#fff" },
  approveText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
  fileViewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", paddingTop: 60 },
  fileViewerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 10 },
  fileViewerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  webviewContainer: { flex: 1, backgroundColor: "#fff", margin: 10, borderRadius: 12, overflow: "hidden" }
});