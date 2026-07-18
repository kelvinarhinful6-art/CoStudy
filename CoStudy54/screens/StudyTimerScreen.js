import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ActivityIndicator, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { logStudySession, getStudySessions } from "../api";

export default function StudyTimerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState("focus"); // focus | break
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins in seconds
  const [isActive, setIsActive] = useState(false);
  const [subject, setSubject] = useState("");
  const [sessions, setSessions] = useState([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const intervalRef = useRef(null);

  const focusTime = 25 * 60;
  const breakTime = 5 * 60;

  const loadStats = useCallback(async () => {
    try {
      const data = await getStudySessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {} finally { setLoadingStats(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      if (mode === "focus") {
        Alert.alert("Focus Session Complete!", "Time for a 5-minute break.");
        logSession(focusTime);
        setMode("break");
        setTimeLeft(breakTime);
      } else {
        Alert.alert("Break Over!", "Ready for another focus session?");
        setMode("focus");
        setTimeLeft(focusTime);
      }
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, timeLeft, mode]);

  const logSession = async (seconds) => {
    const minutes = Math.round(seconds / 60);
    if (minutes > 0) {
      try { await logStudySession(subject.trim() || "General", minutes); await loadStats(); }
      catch (e) { console.log("Failed to log session", e.message); }
    }
  };

  const toggleTimer = () => {
    if (!isActive && mode === "focus" && timeLeft === focusTime && !subject.trim()) {
      Alert.alert("Enter Subject", "Please enter the subject you are studying to track it.");
      return;
    }
    setIsActive(!isActive);
  };

  const resetTimer = () => {
    setIsActive(false);
    if (mode === "focus") {
      logSession(focusTime - timeLeft); // Log partial time
    }
    setTimeLeft(mode === "focus" ? focusTime : breakTime);
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const totalMinsToday = sessions.filter(s => new Date(s.sessionDate).toDateString() === new Date().toDateString()).reduce((sum, s) => sum + s.durationMinutes, 0);
  const hoursToday = Math.floor(totalMinsToday / 60);
  const minsToday = totalMinsToday % 60;

  return (
    <SkyBackground>
      <View style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color="#fff" /></TouchableOpacity>
          <Text style={styles.title}>Study Timer</Text>
        </View>

        <BlurView intensity={mode === "focus" ? 40 : 20} tint="dark" style={styles.timerCard}>
          <Text style={styles.modeText}>{mode === "focus" ? "Focus Mode" : "Break Time"}</Text>
          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>
          
          {mode === "focus" && (
            <TextInput
              style={styles.subjectInput}
              placeholder="What are you studying?"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={subject}
              onChangeText={setSubject}
            />
          )}

          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={toggleTimer}>
              <Ionicons name={isActive ? "pause-circle" : "play-circle"} size={56} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={resetTimer}>
              <Ionicons name="refresh-circle" size={40} color="rgba(255,255,255,0.7)" />
            </TouchableOpacity>
          </View>
        </BlurView>

        <Text style={styles.statsTitle}>Daily Statistics</Text>
        {loadingStats ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
        ) : (
          <BlurView intensity={24} tint="light" style={styles.statsCard}>
            <Ionicons name="time-outline" size={24} color="#fff" />
            <Text style={styles.statsText}>Studied today: {hoursToday > 0 ? `${hoursToday}h ` : ""}{minsToday}m</Text>
          </BlurView>
        )}
      </View>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  title: { color: colors.white, fontSize: 22, fontWeight: "600" },
  timerCard: { borderRadius: 24, padding: 32, alignItems: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  modeText: { color: "rgba(255,255,255,0.7)", fontSize: 16, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  timerText: { color: "#fff", fontSize: 64, fontWeight: "700", fontVariant: ["tabular-nums"] },
  subjectInput: { backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff", fontSize: 14, marginTop: 24, width: "100%", textAlign: "center" },
  controlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20, marginTop: 24 },
  controlBtn: { padding: 4 },
  statsTitle: { color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: "600", marginBottom: 12, marginTop: 24 },
  statsCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  statsText: { color: "#fff", fontSize: 16, fontWeight: "600" }
});