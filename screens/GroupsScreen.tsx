import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { myGroups, createGroup } from "../api";
import { refreshBus } from "../lib/refreshBus";
import type { Group, TabProps } from "../types";

export default function GroupsScreen({ navigation }: TabProps<"Groups">) {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<Group[]>([]);
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
      Alert.alert("Could not load groups", (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Reload whenever another screen (e.g. Invites) signals a change, so a
    // newly-accepted group shows up without a manual pull-to-refresh.
    const unsub = refreshBus.subscribe(() => load());
    return unsub;
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleCreate = async () => {
    if (!name.trim() || !course.trim()) {
      Alert.alert("Missing info", "Please enter a group name and course code.");
      return;
    }
    setCreating(true);
    try {
      await createGroup(name.trim(), course.trim());
      setName("");
      setCourse("");
      await load();
      Alert.alert("Success", "Group created!");
    } catch (e) {
      Alert.alert("Could not create group", (e as Error).message);
    } finally {
      setCreating(false);
    }
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 24 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
      >
        <Text style={styles.title}>Study groups</Text>

        <BlurView intensity={28} tint="light" style={styles.card}>
          <Text style={styles.cardTitle}>Create a group</Text>
          <TextInput
            style={styles.input}
            placeholder="Group name"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={name}
            onChangeText={setName}
          />
          <TextInput
            style={styles.input}
            placeholder="Course code (e.g., CS101)"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={course}
            onChangeText={setCourse}
          />
          <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={creating} activeOpacity={0.85}>
            {creating ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.btnText}>Create group</Text>}
          </TouchableOpacity>
        </BlurView>

        <Text style={styles.sectionLabel}>My groups</Text>
        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : groups.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="people-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No groups yet. Create your first one above.</Text>
          </BlurView>
        ) : (
          groups
            .filter((g, i) => groups.findIndex((x) => x.groupId === g.groupId) === i)
            .map((g) => (
            <TouchableOpacity
              key={g.groupId}
              activeOpacity={0.85}
              onPress={() => navigation.navigate("Chat", { groupId: g.groupId, groupName: g.groupName })}
            >
              <BlurView intensity={28} tint="light" style={styles.groupCard}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.groupName}>{g.groupName}</Text>
                  <Text style={styles.groupCourse}>{g.courseId}</Text>
                </View>
                <View style={styles.memberCount}>
                  <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
                  <Text style={styles.memberCountText}>{g.memberCount}</Text>
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
  title: { color: colors.white, fontSize: 22, fontWeight: "600", marginBottom: 16 },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: "600", marginBottom: 12 },
  input: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 14,
    marginBottom: 10,
  },
  btn: { backgroundColor: colors.white, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  btnText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
  sectionLabel: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  empty: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  groupName: { color: colors.white, fontSize: 16, fontWeight: "600" },
  groupCourse: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  memberCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  memberCountText: { color: colors.white, fontSize: 12, fontWeight: "600" },
});
