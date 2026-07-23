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
import { myGroups, createGroup, groupRecommendations, joinGroup, leaveGroup } from "../api";
import { refreshBus } from "../lib/refreshBus";
import * as chatActivity from "../lib/chatActivity";
import type { Group, TabProps } from "../types";

export default function GroupsScreen({ navigation }: TabProps<"Groups">) {
  const insets = useSafeAreaInsets();
  const [groups, setGroups] = useState<Group[]>([]);
  const [recommendations, setRecommendations] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [name, setName] = useState("");
  const [course, setCourse] = useState("");
  const [creating, setCreating] = useState(false);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [, setActivityTick] = useState(0);

  const load = useCallback(async () => {
    try {
      const [mine, recs] = await Promise.all([
        myGroups(),
        groupRecommendations(),
      ]);
      setGroups(Array.isArray(mine) ? mine : []);
      setRecommendations(Array.isArray(recs) ? recs : []);
    } catch (e) {
      Alert.alert("Could not load groups", (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsub = refreshBus.subscribe(() => load());
    const unsubActivity = chatActivity.subscribe(() => setActivityTick((t) => t + 1));
    return () => {
      unsub();
      unsubActivity();
    };
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

  const handleJoin = async (group: Group) => {
    setJoiningId(group.groupId);
    try {
      await joinGroup(group.groupId);
      await load();
      Alert.alert("Group Joined! 🎉", `You are now a member of ${group.groupName}.`);
    } catch (e) {
      Alert.alert("Could not join group", (e as Error).message);
    } finally {
      setJoiningId(null);
    }
  };

  const handleLeave = (group: Group) => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave ${group.groupName}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              await leaveGroup(group.groupId);
              await load();
              Alert.alert("Left Group", `You have left ${group.groupName}.`);
            } catch (e) {
              Alert.alert("Could not leave group", (e as Error).message);
            }
          },
        },
      ]
    );
  };

  // Sort my groups: most recently active first.
  const sortedGroups = chatActivity.sortByActivity(
    groups.filter((g, i) => groups.findIndex((x) => x.groupId === g.groupId) === i)
  );

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.white} />}
      >
        <Text style={styles.title}>Study Groups</Text>

        {/* Create Group Card */}
        <BlurView intensity={28} tint="light" style={styles.card}>
          <Text style={styles.cardTitle}>Create a New Group</Text>
          <TextInput
            style={styles.input}
            placeholder="Group name (e.g. Data Structures Squad)"
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
            {creating ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.btnText}>Create Group</Text>}
          </TouchableOpacity>
        </BlurView>

        {/* My Groups Section */}
        <Text style={styles.sectionLabel}>My Groups</Text>
        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginVertical: 16 }} />
        ) : sortedGroups.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="people-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No groups joined yet. Create one or join recommended groups below!</Text>
          </BlurView>
        ) : (
          sortedGroups.map((g) => {
            const act = chatActivity.getActivity(g.groupId);
            const unread = act.unreadCount;
            return (
              <TouchableOpacity
                key={g.groupId}
                activeOpacity={0.85}
                onPress={() => navigation.navigate("Chat", { groupId: g.groupId, groupName: g.groupName })}
              >
                <BlurView intensity={28} tint="light" style={styles.groupCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.groupName}>{g.groupName}</Text>
                    <Text style={styles.groupCourse}>{g.courseId || "General Study"}</Text>
                  </View>
                  <View style={styles.rightSide}>
                    {unread > 0 && (
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>{unread > 99 ? "99+" : unread}</Text>
                      </View>
                    )}
                    <View style={styles.memberCount}>
                      <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
                      <Text style={styles.memberCountText}>{g.memberCount ?? 1}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.leaveIconBtn}
                      onPress={() => handleLeave(g)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="log-out-outline" size={18} color="rgba(255,255,255,0.6)" />
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </TouchableOpacity>
            );
          })
        )}

        {/* Recommended Groups Section */}
        <Text style={[styles.sectionLabel, { marginTop: 24 }]}>Recommended Study Groups</Text>
        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginVertical: 16 }} />
        ) : recommendations.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="sparkles-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No group recommendations right now. Check back soon!</Text>
          </BlurView>
        ) : (
          recommendations.map((g) => {
            const score = g.matchScore ?? 88;
            return (
              <BlurView key={g.groupId} intensity={24} tint="light" style={styles.recCard}>
                <View style={styles.recHeader}>
                  <View style={{ flex: 1 }}>
                    <View style={styles.recTitleRow}>
                      <Text style={styles.groupName}>{g.groupName}</Text>
                      <View style={styles.scoreBadge}>
                        <Text style={styles.scoreText}>🎯 {score}% Match</Text>
                      </View>
                    </View>
                    <Text style={styles.groupCourse}>Course: {g.courseId || "General"}</Text>
                    {!!g.description && <Text style={styles.recDesc}>{g.description}</Text>}
                  </View>
                </View>

                <View style={styles.recFooter}>
                  <View style={styles.memberCount}>
                    <Ionicons name="people" size={14} color="rgba(255,255,255,0.8)" />
                    <Text style={styles.memberCountText}>{g.memberCount ?? 1} members</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.joinBtn}
                    onPress={() => handleJoin(g)}
                    disabled={joiningId === g.groupId}
                    activeOpacity={0.8}
                  >
                    {joiningId === g.groupId ? (
                      <ActivityIndicator color="#0b6f8e" size="small" />
                    ) : (
                      <Text style={styles.joinBtnText}>Join Group</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </BlurView>
            );
          })
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
    marginBottom: 20,
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
    padding: 20,
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "center" },
  groupCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  groupName: { color: colors.white, fontSize: 16, fontWeight: "600" },
  groupCourse: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },
  rightSide: { flexDirection: "row", alignItems: "center", gap: 8 },
  unreadBadge: {
    backgroundColor: "#22c55e",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 5,
  },
  unreadText: { color: "#fff", fontSize: 11, fontWeight: "700" },
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
  leaveIconBtn: { padding: 4, marginLeft: 4 },

  /* Recommendation Card Styles */
  recCard: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  recHeader: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  recTitleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  scoreBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.25)",
    borderColor: "rgba(34, 197, 94, 0.5)",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  scoreText: { color: "#4ade80", fontSize: 12, fontWeight: "700" },
  recDesc: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 4 },
  recFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  joinBtn: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 },
  joinBtnText: { color: "#0b6f8e", fontSize: 13, fontWeight: "700" },
});
