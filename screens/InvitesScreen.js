import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { myInvites, acceptInvite, declineInvite } from "../api";

export default function InvitesScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [invites, setInvites] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actingId, setActingId] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await myInvites();
      setInvites(Array.isArray(data) ? data : []);
    } catch (e) { Alert.alert("Could not load invites", e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const act = async (inv, accept) => {
    setActingId(inv.inviteId);
    try {
      if (accept) await acceptInvite(inv.inviteId); else await declineInvite(inv.inviteId);
      await load();
      Alert.alert(accept ? "Joined" : "Declined", accept ? `You joined ${inv.groupName}.` : "Invite declined.");
    } catch (e) { Alert.alert("Action failed", e.message); }
    finally { setActingId(null); }
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color="#fff" /></TouchableOpacity>
          <Text style={styles.title}>Invites</Text>
        </View>
        <Text style={styles.sub}>Group invitations sent to you.</Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : invites.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="mail-open-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No pending invites.</Text>
          </BlurView>
        ) : (
          invites.map((inv) => (
            <BlurView key={inv.inviteId} intensity={26} tint="light" style={styles.card}>
              <View style={styles.cardTop}>
                <Ionicons name="people-circle-outline" size={30} color="#fff" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.group}>{inv.groupName}</Text>
                  <Text style={styles.from}>from {inv.fromUsername || inv.fromUserId}</Text>
                </View>
              </View>
              <View style={styles.btnRow}>
                <TouchableOpacity style={[styles.btn, styles.declineBtn]} onPress={() => act(inv, false)} disabled={actingId === inv.inviteId} activeOpacity={0.85}>
                  <Text style={styles.declineText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.acceptBtn]} onPress={() => act(inv, true)} disabled={actingId === inv.inviteId} activeOpacity={0.85}>
                  {actingId === inv.inviteId ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.acceptText}>Accept</Text>}
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
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  card: { borderRadius: 18, padding: 16, overflow: "hidden", marginBottom: 14, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  group: { color: "#fff", fontSize: 16, fontWeight: "600" },
  from: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  btnRow: { flexDirection: "row", gap: 10 },
  btn: { flex: 1, paddingVertical: 11, borderRadius: 12, alignItems: "center", justifyContent: "center", minHeight: 44 },
  declineBtn: { backgroundColor: "rgba(255,80,80,0.14)", borderWidth: 1, borderColor: "rgba(255,140,140,0.5)" },
  declineText: { color: "#ffb4b4", fontWeight: "600", fontSize: 14 },
  acceptBtn: { backgroundColor: "#fff" },
  acceptText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
});
