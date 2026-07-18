import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { tutorBookings, setZoomLink, startSession, endSession } from "../api";

export default function TutorSessionsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [links, setLinks] = useState({});
  const [busyId, setBusyId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await tutorBookings();
      const list = Array.isArray(data) ? data : [];
      setSessions(list);
      const initial = {};
      list.forEach((s) => { initial[s.bookingId] = s.zoomLink || ""; });
      setLinks(initial);
    } catch (e) { Alert.alert("Could not load sessions", e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const saveLink = async (s) => {
    const link = (links[s.bookingId] || "").trim();
    if (!link) { Alert.alert("Enter a link", "Paste your Zoom meeting link first."); return; }
    setBusyId(s.bookingId);
    try { await setZoomLink(s.bookingId, link); await load(); Alert.alert("Link saved", "Students can now join from the chat."); }
    catch (e) { Alert.alert("Could not save link", e.message); }
    finally { setBusyId(null); }
  };

  const doStart = async (s) => {
    setBusyId(s.bookingId);
    try { await startSession(s.bookingId); Alert.alert("Session started", "The student has been notified."); }
    catch (e) { Alert.alert("Could not start", e.message); }
    finally { setBusyId(null); }
  };

  const doEnd = async (s) => {
    setBusyId(s.bookingId);
    try { await endSession(s.bookingId); await load(); Alert.alert("Session ended", "The student has been notified."); }
    catch (e) { Alert.alert("Could not end", e.message); }
    finally { setBusyId(null); }
  };

  const active = (st) => { const x = (st || "").toUpperCase(); return x !== "COMPLETED" && x !== "CANCELLED" && x !== "CANCELED"; };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color="#fff" /></TouchableOpacity>
          <Text style={styles.title}>My tutoring sessions</Text>
        </View>
        <Text style={styles.sub}>Post the Zoom link, start and end sessions, and message your students.</Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : sessions.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="briefcase-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No one has booked you yet.</Text>
          </BlurView>
        ) : (
          sessions.map((s) => (
            <BlurView key={s.bookingId} intensity={26} tint="light" style={styles.card}>
              <View style={styles.cardTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.course}>{s.courseId} | {s.hours} hr</Text>
                  <Text style={styles.meta}>{s.grossAmount} {s.currency} | {s.status}</Text>
                </View>
              </View>

              {active(s.status) && (
                <>
                  <View style={styles.inputRow}>
                    <Ionicons name="link-outline" size={16} color="rgba(255,255,255,0.9)" />
                    <TextInput
                      style={styles.input}
                      placeholder="Paste Zoom link"
                      placeholderTextColor="rgba(255,255,255,0.6)"
                      value={links[s.bookingId] || ""}
                      onChangeText={(v) => setLinks((m) => ({ ...m, [s.bookingId]: v }))}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={() => saveLink(s)} disabled={busyId === s.bookingId}>
                      <Text style={styles.saveText}>Save</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.btnRow}>
                    <TouchableOpacity style={[styles.btn, styles.startBtn]} onPress={() => doStart(s)} disabled={busyId === s.bookingId} activeOpacity={0.85}>
                      <Ionicons name="play" size={15} color="#0b6f8e" />
                      <Text style={styles.startText}>Start</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, styles.endBtn]} onPress={() => doEnd(s)} disabled={busyId === s.bookingId} activeOpacity={0.85}>
                      <Ionicons name="stop" size={15} color="#ffb4b4" />
                      <Text style={styles.endText}>End</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}

              <TouchableOpacity style={styles.chatBtn} onPress={() => navigation.navigate("SessionChat", { bookingId: s.bookingId, title: "Session: " + s.courseId })} activeOpacity={0.85}>
                <Ionicons name="chatbubbles-outline" size={16} color="#fff" />
                <Text style={styles.chatText}>Message student</Text>
              </TouchableOpacity>
            </BlurView>
          ))
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { color: "#fff", fontSize: 21, fontWeight: "600" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 18 },
  empty: { borderRadius: 16, padding: 24, alignItems: "center", gap: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  card: { borderRadius: 18, padding: 16, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  cardTop: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  course: { color: "#fff", fontSize: 16, fontWeight: "600" },
  meta: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 9, marginBottom: 10 },
  input: { flex: 1, color: "#fff", fontSize: 13 },
  saveText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  btnRow: { flexDirection: "row", gap: 10, marginBottom: 10 },
  btn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 10, borderRadius: 12, minHeight: 42 },
  startBtn: { backgroundColor: "#fff" },
  startText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
  endBtn: { backgroundColor: "rgba(255,80,80,0.14)", borderWidth: 1, borderColor: "rgba(255,140,140,0.5)" },
  endText: { color: "#ffb4b4", fontWeight: "600", fontSize: 14 },
  chatBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 11, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  chatText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
