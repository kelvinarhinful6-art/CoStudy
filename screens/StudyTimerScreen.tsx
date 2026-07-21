import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { logStudySession, getStudySessions } from "../api";
import type { StackProps, StudySession } from "../types";

export default function StudyTimerScreen({ navigation }: StackProps<"StudyTimer">) {
  const insets = useSafeAreaInsets();
  const [mode, setMode] = useState("focus");
  const [duration, setDuration] = useState(25);
  const [timeLeft, setTimeLeft] = useState(25 * 60);
  const [isActive, setIsActive] = useState(false);
  const [subject, setSubject] = useState("");
  const [sessions, setSessions] = useState<StudySession[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadStats = useCallback(async () => {
    try {
      const data = await getStudySessions();
      setSessions(Array.isArray(data) ? data : []);
    } catch (e) {
      // ignore
    } finally {
      setLoadingStats(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      intervalRef.current = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft === 0) {
      setIsActive(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (mode === "focus") {
        Alert.alert("Focus Session Complete! 🎉", "Great job! Time for a well-deserved break.");
        logSession(duration);
        setMode("break");
        setDuration(5);
        setTimeLeft(5 * 60);
      } else {
        Alert.alert("Break Over! ⏰", "Ready for another focus session?");
        setMode("focus");
        setDuration(25);
        setTimeLeft(25 * 60);
      }
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isActive, timeLeft, mode]);

  const logSession = async (minutes: number) => {
    if (minutes > 0) {
      try {
        await logStudySession(subject.trim() || "General", minutes);
        await loadStats();
      } catch (e) {
        console.log("Failed to log session", (e as Error).message);
      }
    }
  };

  const toggleTimer = () => {
    if (!isActive && mode === "focus" && timeLeft === duration * 60 && !subject.trim()) {
      Alert.alert("Enter Subject", "Please enter the subject you are studying to track it.");
      return;
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsActive(!isActive);
  };

  const changeDuration = (mins: number) => {
    if (isActive) return;
    Haptics.selectionAsync();
    setDuration(mins);
    setTimeLeft(mins * 60);
  };

  const resetTimer = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsActive(false);
    if (mode === "focus" && timeLeft < duration * 60) {
      const elapsedMins = Math.round((duration * 60 - timeLeft) / 60);
      if (elapsedMins > 0) {
        logSession(elapsedMins);
      }
    }
    setTimeLeft(duration * 60);
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  const progress = timeLeft / (duration * 60);

  const totalMinsToday = sessions
    .filter((s) => new Date(s.sessionDate || "").toDateString() === new Date().toDateString())
    .reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const hoursToday = Math.floor(totalMinsToday / 60);
  const minsToday = totalMinsToday % 60;
  const sessionsToday = sessions.filter(
    (s) => new Date(s.sessionDate || "").toDateString() === new Date().toDateString()
  ).length;

  return (
    <SkyBackground>
      <View style={{ flex: 1, paddingTop: insets.top + 16, paddingHorizontal: 20 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Study Timer</Text>
        </View>

        <View style={styles.modeToggle}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "focus" && styles.modeBtnActive]}
            onPress={() => {
              if (!isActive) {
                setMode("focus");
                setDuration(25);
                setTimeLeft(25 * 60);
              }
            }}
          >
            <Text style={[styles.modeBtnText, mode === "focus" && styles.modeBtnTextActive]}>Focus</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === "break" && styles.modeBtnActive]}
            onPress={() => {
              if (!isActive) {
                setMode("break");
                setDuration(5);
                setTimeLeft(5 * 60);
              }
            }}
          >
            <Text style={[styles.modeBtnText, mode === "break" && styles.modeBtnTextActive]}>Break</Text>
          </TouchableOpacity>
        </View>

        <BlurView intensity={mode === "focus" ? 30 : 20} tint="dark" style={styles.timerCard}>
          <Text style={styles.modeLabel}>{mode === "focus" ? "Focus Mode" : "Break Time"}</Text>

          <Text style={styles.timerText}>{formatTime(timeLeft)}</Text>

          {/* Built-in Linear Progress Bar */}
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressBar,
                { width: `${progress * 100}%`, backgroundColor: mode === "focus" ? "#fff" : "#1f9d6b" },
              ]}
            />
          </View>

          {mode === "focus" && (
            <TextInput
              style={styles.subjectInput}
              placeholder="What are you studying?"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={subject}
              onChangeText={setSubject}
            />
          )}

          {!isActive && (
            <View style={styles.durationRow}>
              {[15, 25, 50].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[styles.durationChip, duration === m && styles.durationChipActive]}
                  onPress={() => changeDuration(m)}
                >
                  <Text style={[styles.durationText, duration === m && styles.durationTextActive]}>{m}m</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          <View style={styles.controlsRow}>
            <TouchableOpacity style={styles.controlBtn} onPress={toggleTimer}>
              <Ionicons name={isActive ? "pause-circle" : "play-circle"} size={64} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.controlBtn} onPress={resetTimer}>
              <Ionicons name="refresh-circle" size={44} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>
          </View>
        </BlurView>

        <Text style={styles.statsTitle}>Daily Statistics</Text>
        {loadingStats ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 16 }} />
        ) : (
          <View style={styles.statsRow}>
            <BlurView intensity={24} tint="light" style={styles.statsCard}>
              <Ionicons name="time-outline" size={24} color="#fff" />
              <Text style={styles.statsText}>{hoursToday > 0 ? `${hoursToday}h ` : ""}{minsToday}m</Text>
              <Text style={styles.statsSub}>Studied Today</Text>
            </BlurView>
            <BlurView intensity={24} tint="light" style={styles.statsCard}>
              <Ionicons name="checkmark-done-outline" size={24} color="#fff" />
              <Text style={styles.statsText}>{sessionsToday}</Text>
              <Text style={styles.statsSub}>Sessions</Text>
            </BlurView>
          </View>
        )}
      </View>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  title: { color: colors.white, fontSize: 22, fontWeight: "600" },
  modeToggle: { flexDirection: "row", backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 12, padding: 4, marginBottom: 24 },
  modeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: "center" },
  modeBtnActive: { backgroundColor: "rgba(11, 111, 142, 0.5)" },
  modeBtnText: { color: "rgba(255,255,255,0.6)", fontWeight: "600", fontSize: 14 },
  modeBtnTextActive: { color: "#fff" },
  timerCard: {
    borderRadius: 24,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    marginBottom: 24,
  },
  modeLabel: { color: "rgba(255,255,255,0.7)", fontSize: 14, fontWeight: "600", textTransform: "uppercase", letterSpacing: 1, marginBottom: 16 },
  timerText: { color: "#fff", fontSize: 64, fontWeight: "700", fontVariant: ["tabular-nums"], marginBottom: 20 },
  progressTrack: { width: "100%", height: 8, backgroundColor: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden", marginBottom: 24 },
  progressBar: { height: "100%", borderRadius: 4 },
  subjectInput: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: "#fff",
    fontSize: 14,
    width: "100%",
    textAlign: "center",
    marginBottom: 20,
  },
  durationRow: { flexDirection: "row", justifyContent: "center", gap: 10, marginBottom: 20 },
  durationChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  durationChipActive: { backgroundColor: "#fff", borderColor: "#fff" },
  durationText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  durationTextActive: { color: "#0b6f8e" },
  controlsRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 20 },
  controlBtn: { padding: 4 },
  statsTitle: { color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: "600", marginBottom: 12 },
  statsRow: { flexDirection: "row", gap: 12 },
  statsCard: {
    flex: 1,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    gap: 4,
  },
  statsText: { color: "#fff", fontSize: 20, fontWeight: "700" },
  statsSub: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
});
