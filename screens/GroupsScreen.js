import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, RefreshControl } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SkyBackground from "./SkyBackground";
import { myGroups, createGroup, joinGroup } from "../api";

export default function GroupsScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await myGroups();
      setGroups(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Could not load groups", e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  const onRefresh = () => { setRefreshing(true); load(); };

  const handleCreate = async () => {
    if (!name.trim() || !course.trim()) {
      Alert.alert("Missing info", "Enter a group name and a course code.");
      return;
    }
    setCreating(true);
    try {
      const g = await createGroup(name.trim(), course.trim().toUpperCase());
      if (g && g.groupId) { try { await joinGroup(g.groupId); } catch (e) {} }
      setName(""); setCourse("");
      await load();
      Alert.alert("Group created", "Your study group is live.");
    } catch (e) {
      Alert.alert("Could not create group", e.message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.title}>Study groups</Text>
        <BlurView intensity={28} tint="light" style={styles.createCard}>
          <Text style={styles.cardHeading}>Create a group</Text>
          <View style={styles.inputRow}>
            <Ionicons name="people-outline" size={18} color="rgba(255,255,255,0.9)" />
            <TextInput style={styles.input} placeholder="Group name (e.g. Calculus Crew)" placeholderTextColor="rgba(255,255,255,0.6)" value={name} onChangeText={setName} />
          </View>
          <View style={styles.inputRow}>
            <Ionicons name="book-outline" size={18} color="rgba(255,255,255,0.9)" />
            <TextInput style={styles.input} placeholder="Course code (e.g. MATH101)" placeholderTextColor="rgba(255,255,255,0.6)" value={course} onChangeText={setCourse} autoCapitalize="characters" />
          </View>
          <TouchableOpacity style={styles.button} onPress={handleCreate} disabled={creating} activeOpacity={0.85}>
            {creating ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Create group</Text>}
          </TouchableOpacity>
        </BlurView>
        <Text style={styles.sectionLabel}>My groups</Text>
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
        ) : groups.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="people-outline" size={30} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No groups yet. Create your first one above.</Text>
          </BlurView>
        ) : (
          groups.map((g) => (
            <TouchableOpacity key={g.groupId} activeOpacity={0.85} onPress={() => navigation.navigate("Chat", { groupId: g.groupId, groupName: g.groupName })}>
              <BlurView intensity={24} tint="light" style={styles.groupCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{g.groupName}</Text>
                  <Text style={styles.groupCourse}>{g.courseId}</Text>
                </View>
                <Ionicons name="chatbubbles-outline" size={18} color="#fff" style={{ marginRight: 8 }} />
                <View style={styles.memberPill}>
                  <Ionicons name="person" size={13} color="#0b6f8e" />
                  <Text style={styles.memberText}>{g.memberCount}</Text>
                </View>
              </BlurView>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  title: { color: "#fff", fontSize: 24, fontWeight: "600", marginBottom: 16 },
  createCard: { borderRadius: 18, padding: 16, overflow: "hidden", marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  cardHeading: { color: "#fff", fontSize: 16, fontWeight: "600", marginBottom: 12 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 10 },
  input: { flex: 1, color: "#fff", fontSize: 14 },
  button: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 13, alignItems: "center", justifyContent: "center", minHeight: 46, marginTop: 2 },
  buttonText: { color: "#0b6f8e", fontWeight: "600", fontSize: 15 },
  sectionLabel: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  empty: { borderRadius: 16, padding: 24, alignItems: "center", gap: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
  groupCard: { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 16, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  groupName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  groupCourse: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 3 },
  memberPill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5 },
  memberText: { color: "#0b6f8e", fontWeight: "600", fontSize: 13 },
});

