import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ActivityIndicator,
  Alert,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { login, register } from "../api";
import { registerForPushNotifications } from "../lib/notifications";
import type { StackProps } from "../types";

export default function LoginScreen({ navigation }: StackProps<"Login">) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const isRegister = mode === "register";

  const handleSubmit = async () => {
    setLoading(true);
    try {
      if (isRegister) {
        await register(username.trim(), email.trim(), password);
      } else {
        await login((email || username).trim(), password);
      }
      // Register this device for lock-screen push notifications.
      registerForPushNotifications();
      navigation.replace("Main");
    } catch (e) {
      Alert.alert(isRegister ? "Sign up failed" : "Sign in failed", (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <LinearGradient colors={colors.sky} style={styles.fill}>
      <StatusBar barStyle="light-content" />
      <Ionicons name="book" size={46} color="rgba(255,255,255,0.16)" style={styles.floatA} />
      <Ionicons name="pencil" size={52} color="rgba(255,255,255,0.16)" style={styles.floatB} />
      <Ionicons name="library" size={40} color="rgba(255,255,255,0.14)" style={styles.floatC} />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.center}>
        <View style={styles.brandRow}>
          <Ionicons name="school" size={30} color={colors.white} />
          <Text style={styles.brand}>CoStudy</Text>
        </View>
        <Text style={styles.tagline}>Study together. Achieve more.</Text>
        <BlurView intensity={30} tint="light" style={styles.card}>
          <Text style={styles.cardTitle}>{isRegister ? "Create account" : "Welcome back"}</Text>
          <Text style={styles.cardSub}>{isRegister ? "Join CoStudy" : "Sign in to continue"}</Text>
          {isRegister && (
            <View style={styles.inputRow}>
              <Ionicons name="person-outline" size={20} color="rgba(255,255,255,0.9)" />
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="rgba(255,255,255,0.7)"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>
          )}
          <View style={styles.inputRow}>
            <Ionicons name="mail-outline" size={20} color="rgba(255,255,255,0.9)" />
            <TextInput
              style={styles.input}
              placeholder={isRegister ? "Email" : "Email or username"}
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />
          </View>
          <View style={styles.inputRow}>
            <Ionicons name="lock-closed-outline" size={20} color="rgba(255,255,255,0.9)" />
            <TextInput
              style={styles.input}
              placeholder="Password"
              placeholderTextColor="rgba(255,255,255,0.7)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
            />
          </View>
          <TouchableOpacity
            style={styles.button}
            activeOpacity={0.85}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#0b6f8e" />
            ) : (
              <Text style={styles.buttonText}>{isRegister ? "Sign up" : "Sign in"}</Text>
            )}
          </TouchableOpacity>
        </BlurView>
        <TouchableOpacity onPress={() => setMode(isRegister ? "login" : "register")}>
          <Text style={styles.footer}>
            {isRegister ? "Already have an account? " : "New here? "}
            <Text style={styles.footerLink}>{isRegister ? "Sign in" : "Create account"}</Text>
          </Text>
        </TouchableOpacity>
      </KeyboardAvoidingView>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  floatA: { position: "absolute", top: 90, left: 28 },
  floatB: { position: "absolute", top: 200, right: 30, transform: [{ rotate: "20deg" }] },
  floatC: { position: "absolute", bottom: 120, left: 40 },
  brandRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8 },
  brand: { fontSize: 26, fontWeight: "600", color: "#ffffff" },
  tagline: { fontSize: 14, color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 6, marginBottom: 28 },
  card: {
    borderRadius: 22,
    padding: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  cardTitle: { fontSize: 19, fontWeight: "600", color: "#ffffff" },
  cardSub: { fontSize: 13, color: "rgba(255,255,255,0.8)", marginTop: 4, marginBottom: 18 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  input: { flex: 1, fontSize: 15, color: "#ffffff" },
  button: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 6,
    minHeight: 48,
    justifyContent: "center",
  },
  buttonText: { fontSize: 16, fontWeight: "600", color: "#0b6f8e" },
  footer: { textAlign: "center", color: "rgba(255,255,255,0.85)", fontSize: 13, marginTop: 20 },
  footerLink: { color: "#ffffff", fontWeight: "600" },
});
