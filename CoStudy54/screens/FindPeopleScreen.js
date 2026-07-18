import React, { useState, useCallback, useMemo } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Alert, Modal } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { session, listUsers, myGroups, sendInvite } from "../api";

export default function FindPeopleScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const me = session.user || {};
  const meId = me.userId || "";
  const myProgram = (me.program || "").trim().toLowerCase();
  const [people, setPeople] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [invitingId, setInvitingId] = useState(null);
  const [viewingPerson, setViewingPerson] = useState(null);

  const load = useCallback(async () => {
    try {
      const [u, g] = await Promise.all([listUsers(), myGroups()]);
      setPeople((Array.isArray(u) ? u : []).filter((p) => p.userId !== meId));
      setGroups(Array.isArray(g) ? g : []);
    } catch (e) { Alert.alert("Could not load people", e.message); }
    finally { setLoading(false); setRefreshing(false); }
  }, [meId]);

  useFocusEffect(useCallback(() => { load(); }, [load]));
  const onRefresh = () => { setRefreshing(true); load(); };

  const sortedPeople = useMemo(() => {
    if (!myProgram) return people;
    const mine = [];
    const rest = [];
    for (const p of people) {
      const theirs = (p.program || "").trim().toLowerCase();
      if (theirs && theirs === myProgram) mine.push(p);
      else rest.push(p);
    }
    return [...mine, ...rest];
  }, [people, myProgram]);

  const isSameProgram = (p) => {
    const theirs = (p.program || "").trim().toLowerCase();
    return myProgram && theirs && theirs === myProgram;
  };

  const invite = (person) => {
    if (groups.length === 0) {
      Alert.alert("No groups", "Create a group first, then you can invite people to it.");
      return;
    }
    const buttons = groups.slice(0, 3).map((g) => ({
      text: g.groupName,
      onPress: async () => {
        setInvitingId(person.userId);
        try {
          await sendInvite(g.groupId, g.groupName, person.userId);
          Alert.alert("Invite sent", `${person.username} was invited to ${g.groupName}.`);
        } catch (e) { Alert.alert("Could not invite", e.message); }
        finally { setInvitingId(null); }
      },
    }));
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Invite to which group?", `Invite ${person.username} to:`, buttons);
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.title}>Find people</Text>
        <Text style={styles.sub}>Invite other students to your study groups.</Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : sortedPeople.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="people-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No other users yet.</Text>
          </BlurView>
        ) : (
          sortedPeople.map((p) => (
            <TouchableOpacity key={p.userId} activeOpacity={0.85} onPress={() => setViewingPerson(p)}>
              <BlurView intensity={24} tint="light" style={styles.card}>
                <View style={styles.avatar}><Text style={styles.avatarText}>{(p.username || "?").charAt(0).toUpperCase()}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.name}>{p.username}</Text>
                  <Text style={styles.role}>{p.userType}</Text>
                  {isSameProgram(p) && (
                    <View style={styles.sameProgramTag}>
                      <Ionicons name="checkmark-circle" size={12} color="#0b6f8e" />
                      <Text style={styles.sameProgramText}>Same program</Text>
                    </View>
                  )}
                </View>
                <TouchableOpacity style={styles.inviteBtn} onPress={() => invite(p)} disabled={invitingId === p.userId} activeOpacity={0.85}>
                  {invitingId === p.userId ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.inviteText}>Invite</Text>}
                </TouchableOpacity>
              </BlurView>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      <Modal visible={!!viewingPerson} transparent animationType="fade" onRequestClose={() => setViewingPerson(null)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.modalCard}>
            {viewingPerson && (
              <>
                <View style={styles.modalAvatar}><Text style={styles.modalAvatarText}>{(viewingPerson.username || "?").charAt(0).toUpperCase()}</Text></View>
                <Text style={styles.modalName}>{viewingPerson.username}</Text>
                <Text style={styles.modalRole}>{viewingPerson.userType}</Text>

                <View style={styles.modalInfoRow}><Ionicons name="person-outline" size={16} color="rgba(255,255,255,0.85)" /><Text style={styles.modalInfoText}>{viewingPerson.fullName || "Full name not set"}</Text></View>
                <View style={styles.modalInfoRow}><Ionicons name="book-outline" size={16} color="rgba(255,255,255,0.85)" /><Text style={styles.modalInfoText}>{viewingPerson.program || "Program not set"}</Text></View>
                <View style={styles.modalInfoRow}><Ionicons name="calendar-outline" size={16} color="rgba(255,255,255,0.85)" /><Text style={styles.modalInfoText}>{viewingPerson.age != null ? `${viewingPerson.age} years old` : "Age not set"}</Text></View>
                <View style={styles.modalInfoRow}><Ionicons name="school-outline" size={16} color="rgba(255,255,255,0.85)" /><Text style={styles.modalInfoText}>{viewingPerson.yearOfStudy != null ? `Year ${viewingPerson.yearOfStudy}` : "Year not set"}</Text></View>

                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setViewingPerson(null)} activeOpacity={0.85}>
                  <Text style={styles.modalCloseText}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </BlurView>
        </View>
      </Modal>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 18 },
  empty: { borderRadius: 16, padding: 24, alignItems: "center", gap: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  card: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 14, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  avatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#0b6f8e", fontSize: 18, fontWeight: "700" },
  name: { color: "#fff", fontSize: 16, fontWeight: "600" },
  role: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  sameProgramTag: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 3, marginTop: 6, alignSelf: "flex-start" },
  sameProgramText: { color: "#0b6f8e", fontSize: 10, fontWeight: "700" },
  inviteBtn: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 9, minWidth: 76, alignItems: "center" },
  inviteText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 20, padding: 24, alignItems: "center", overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  modalAvatar: { width: 56, height: 56, borderRadius: 28, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", marginBottom: 10 },
  modalAvatarText: { color: "#0b6f8e", fontSize: 24, fontWeight: "700" },
  modalName: { color: "#fff", fontSize: 19, fontWeight: "600" },
  modalRole: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginBottom: 14 },
  modalInfoRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10, alignSelf: "flex-start" },
  modalInfoText: { color: "#fff", fontSize: 14 },
  modalCloseBtn: { marginTop: 10, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, paddingHorizontal: 24, paddingVertical: 10 },
  modalCloseText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});