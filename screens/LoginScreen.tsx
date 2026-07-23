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
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView,
} from "react-native";

import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme";
import { login, register, requestOtp } from "../api";
import { registerForPushNotifications } from "../lib/notifications";
import type { StackProps } from "../types";

export default function LoginScreen({ navigation }: StackProps<"Login">) {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  // 4-Digit OTP state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);
  const [resending, setResending] = useState(false);

  const isRegister = mode === "register";

  const handleSubmit = async () => {
    if (isRegister) {
      if (!username.trim()) {
        Alert.alert("Missing Username", "Please enter a username.");
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        Alert.alert("Invalid Email", "Please enter a valid email address.");
        return;
      }
      if (password.length < 8) {
        Alert.alert("Weak Password", "Password must be at least 8 characters long.");
        return;
      }

      setLoading(true);
      try {
        await requestOtp(email.trim(), username.trim());
        setShowOtpModal(true);
        Alert.alert(
          "Code Sent! ✉️",
          `A 4-digit verification code was sent to ${email.trim()}. Please check your email inbox.`
        );
      } catch (e) {
        Alert.alert("Registration failed", (e as Error).message);
      } finally {
        setLoading(false);
      }
    } else {
      setLoading(true);
      try {
        await login((email || username).trim(), password);
        registerForPushNotifications();
        navigation.replace("Main");
      } catch (e) {
        Alert.alert("Sign in failed", (e as Error).message);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleVerifyOtp = async () => {
    const code = otpCode.trim();
    if (code.length !== 4) {
      Alert.alert("Invalid Code", "Please enter the 4-digit code sent to your email.");
      return;
    }

    setVerifyingOtp(true);
    try {
      await register(username.trim(), email.trim(), password, "STUDENT", code);
      registerForPushNotifications();
      setShowOtpModal(false);
      Alert.alert("Welcome! 🎉", "Your account has been created successfully.");
      navigation.replace("Main");
    } catch (e) {
      Alert.alert("Verification failed", (e as Error).message);
    } finally {
      setVerifyingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    setResending(true);
    try {
      await requestOtp(email.trim(), username.trim());
      Alert.alert("New Code Sent ✉️", `A new 4-digit code was sent to ${email.trim()}.`);
    } catch (e) {
      Alert.alert("Could not resend code", (e as Error).message);
    } finally {
      setResending(false);
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

      {/* 4-Digit Email OTP Verification Modal */}
      <Modal visible={showOtpModal} transparent animationType="slide" onRequestClose={() => setShowOtpModal(false)}>
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalBackdrop}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : "height"}
              style={{ width: "100%", alignItems: "center" }}
            >
              <ScrollView
                contentContainerStyle={{ alignItems: "center", justifyContent: "center", width: "100%" }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <BlurView intensity={45} tint="dark" style={styles.modalCard}>
                  <View style={styles.otpHeaderIcon}>
                    <Ionicons name="mail-open" size={32} color="#0b6f8e" />
                  </View>
                  <Text style={styles.otpTitle}>Verify Your Email</Text>
                  <Text style={styles.otpSub}>
                    We sent a 4-digit verification code to{"\n"}
                    <Text style={{ fontWeight: "700", color: "#fff" }}>{email.trim()}</Text>
                  </Text>

                  <Text style={styles.otpLabel}>Enter 4-Digit Code</Text>
                  <TextInput
                    style={styles.otpInput}
                    placeholder="0 0 0 0"
                    placeholderTextColor="rgba(255,255,255,0.4)"
                    value={otpCode}
                    onChangeText={(txt) => setOtpCode(txt.replace(/[^0-9]/g, "").slice(0, 4))}
                    keyboardType="number-pad"
                    maxLength={4}
                  />

                  <TouchableOpacity
                    style={styles.otpVerifyBtn}
                    onPress={handleVerifyOtp}
                    disabled={verifyingOtp}
                    activeOpacity={0.85}
                  >
                    {verifyingOtp ? (
                      <ActivityIndicator color="#0b6f8e" />
                    ) : (
                      <Text style={styles.otpVerifyBtnText}>Verify & Create Account</Text>
                    )}
                  </TouchableOpacity>

                  <View style={styles.otpFooterRow}>
                    <TouchableOpacity onPress={handleResendOtp} disabled={resending} style={{ padding: 6 }}>
                      <Text style={styles.resendText}>
                        {resending ? "Resending..." : "Resend Code"}
                      </Text>
                    </TouchableOpacity>
                    <Text style={{ color: "rgba(255,255,255,0.4)" }}>|</Text>
                    <TouchableOpacity onPress={() => setShowOtpModal(false)} style={{ padding: 6 }}>
                      <Text style={styles.cancelText}>Edit Email</Text>
                    </TouchableOpacity>
                  </View>
                </BlurView>
              </ScrollView>
            </KeyboardAvoidingView>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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

  // OTP Modal Styles
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "center", paddingHorizontal: 20 },
  modalCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    backgroundColor: "rgba(15, 23, 42, 0.88)",
  },
  otpHeaderIcon: { width: 64, height: 64, borderRadius: 32, backgroundColor: "#fff", justifyContent: "center", alignItems: "center", marginBottom: 14 },
  otpTitle: { fontSize: 22, fontWeight: "700", color: "#fff", marginBottom: 6 },
  otpSub: { fontSize: 13, color: "rgba(255,255,255,0.85)", textAlign: "center", marginBottom: 20, lineHeight: 18 },
  otpLabel: { color: "#fff", fontSize: 13, fontWeight: "600", marginBottom: 10 },
  otpInput: {
    width: 200,
    height: 54,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 14,
    textAlign: "center",
    fontSize: 26,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 12,
    marginBottom: 20,
  },
  otpVerifyBtn: {
    width: "100%",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 16,
  },
  otpVerifyBtnText: { color: "#0b6f8e", fontSize: 16, fontWeight: "700" },
  otpFooterRow: { flexDirection: "row", gap: 14, alignItems: "center" },
  resendText: { color: "#38bdf8", fontSize: 13, fontWeight: "600" },
  cancelText: { color: "rgba(255,255,255,0.7)", fontSize: 13 },
});
