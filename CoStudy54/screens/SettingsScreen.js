import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";

// Isolate the toggle row so it manages its own state and doesn't trigger parent re-renders
const ToggleRow = ({ icon, label, initialValue }) => {
  const [val, setVal] = useState(initialValue);
  return (
    <View style={styles.row}>
      <Ionicons name={icon} size={20} color="#fff" style={styles.rowIcon} />
      <Text style={styles.rowLabel}>{label}</Text>
      <Switch 
        trackColor={{ false: "rgba(255,255,255,0.2)", true: "#0b6f8e" }} 
        thumbColor={val ? "#fff" : "#f4f3f4"} 
        onValueChange={setVal} 
        value={val} 
      />
    </View>
  );
};

export default function SettingsScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  const handleAccountAction = (action) => {
    if (action === "Edit profile") {
      navigation.navigate("Main", { screen: "Profile" });
    } else if (action === "Change password") {
      Alert.alert("Feature Disabled", "Password changes are temporarily disabled for maintenance.");
    } else if (action === "Delete account") {
      Alert.alert("Delete Account", "Are you sure you want to delete your account? This cannot be undone.", [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: () => Alert.alert("Deleted", "Your account has been marked for deletion.") }
      ]);
    }
  };

  const Section = ({ title, children }) => (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <BlurView intensity={28} tint="light" style={styles.card}>
        {children}
      </BlurView>
    </View>
  );

  const ActionRow = ({ icon, label, onPress, danger }) => (
    <TouchableOpacity style={styles.row} onPress={onPress} activeOpacity={0.8}>
      <Ionicons name={icon} size={20} color={danger ? "#ff4d4d" : "#fff"} style={styles.rowIcon} />
      <Text style={[styles.rowLabel, danger && { color: "#ff4d4d" }]}>{label}</Text>
      <Ionicons name="chevron-forward" size={18} color="rgba(255,255,255,0.4)" />
    </TouchableOpacity>
  );

  const Divider = () => <View style={styles.divider} />;

  return (
    <SkyBackground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color="#fff" /></TouchableOpacity>
          <Text style={styles.title}>Settings</Text>
        </View>

        <Section title="Account">
          <ActionRow icon="person-outline" label="Edit profile" onPress={() => handleAccountAction("Edit profile")} />
          <Divider />
          <ActionRow icon="lock-closed-outline" label="Change password" onPress={() => handleAccountAction("Change password")} />
          <Divider />
          <ActionRow icon="trash-outline" label="Delete account" onPress={() => handleAccountAction("Delete account")} danger />
        </Section>

        <Section title="Notifications">
          <ToggleRow icon="chatbubbles-outline" label="Message notifications" initialValue={true} />
          <Divider />
          <ToggleRow icon="people-outline" label="Group notifications" initialValue={true} />
          <Divider />
          <ToggleRow icon="school-outline" label="Tutoring notifications" initialValue={true} />
          <Divider />
          <ToggleRow icon="mail-outline" label="Invite notifications" initialValue={true} />
        </Section>

        <Section title="Privacy">
          <ToggleRow icon="eye-outline" label="Online status" initialValue={true} />
          <Divider />
          <ToggleRow icon="checkmark-done-outline" label="Read receipts" initialValue={true} />
        </Section>

        <Section title="Chat">
          <ToggleRow icon="download-outline" label="Media auto-download" initialValue={false} />
          <Divider />
          <ActionRow icon="trash-outline" label="Clear cache" onPress={() => Alert.alert("Cache Cleared", "Temporary files have been removed.")} />
        </Section>

        <Section title="App">
          <ActionRow icon="information-circle-outline" label="Version 1.0.0" onPress={() => {}} />
        </Section>

      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  title: { color: colors.white, fontSize: 22, fontWeight: "600" },
  section: { marginBottom: 24 },
  sectionTitle: { color: "rgba(255,255,255,0.7)", fontSize: 13, fontWeight: "600", marginBottom: 8, marginLeft: 4, textTransform: "uppercase" },
  card: { borderRadius: 16, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.15)" },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16, minHeight: 48 },
  rowIcon: { marginRight: 12 },
  rowLabel: { flex: 1, color: colors.white, fontSize: 15 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.1)", marginLeft: 48 },
});