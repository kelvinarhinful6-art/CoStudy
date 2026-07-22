import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { session, myGroups } from "../api";

const sections = [
  { key: "Groups", icon: "people", sub: "Join & study", tab: "Groups" },
  { key: "Find people", icon: "search", sub: "Invite to groups", screen: "FindPeople" },
  { key: "Tutors", icon: "school", sub: "Book a pro", tab: "Tutors" },
  { key: "Invites", icon: "mail-unread", sub: "Requests to you", screen: "Invites" },
];

export default function HomeScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const name = session.user ? session.user.username : "there";
  const [groupCount, setGroupCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      myGroups()
        .then((data) => { if (active) setGroupCount(Array.isArray(data) ? data.length : 0); })
        .catch(() => {});
      return () => { active = false; };
    }, [])
  );

  return (
    <SkyBackground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 24 }}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.hello}>Welcome back</Text>
            <Text style={styles.name}>Hi, {name}</Text>
          </View>
          <Ionicons name="notifications-outline" size={24} color={colors.white} />
        </View>

        <View style={styles.statRow}>
          <BlurView intensity={28} tint="light" style={styles.stat}>
            <Text style={styles.statLabel}>My groups</Text>
            <Text style={styles.statValue}>{groupCount}</Text>
          </BlurView>
          <BlurView intensity={28} tint="light" style={styles.stat}>
            <Text style={styles.statLabel}>Sessions</Text>
            <Text style={styles.statValue}>0</Text>
          </BlurView>
        </View>

        <View style={styles.grid}>
          {sections.map((s) => (
            <TouchableOpacity key={s.key} activeOpacity={0.85} style={styles.cardWrap} onPress={() => navigation.navigate(s.screen ? s.screen : s.tab)}>
              <BlurView intensity={28} tint="light" style={styles.card}>
                <Ionicons name={s.icon} size={26} color={colors.white} />
                <Text style={styles.cardTitle}>{s.key}</Text>
                <Text style={styles.cardSub}>{s.sub}</Text>
              </BlurView>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  hello: { color: "rgba(255,255,255,0.8)", fontSize: 13 },
  name: { color: "#fff", fontSize: 22, fontWeight: "600", marginTop: 2 },
  statRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  stat: { flex: 1, borderRadius: 16, padding: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  statLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13 },
  statValue: { color: "#fff", fontSize: 26, fontWeight: "600", marginTop: 6 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between" },
  cardWrap: { width: "48%", marginBottom: 14 },
  card: { borderRadius: 18, padding: 16, overflow: "hidden", minHeight: 110, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)" },
  cardTitle: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 10 },
  cardSub: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
});
