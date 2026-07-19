import React, { useState, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Modal, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import DateTimePicker from "@react-native-community/datetimepicker";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { getStudyTasks, createStudyTask, toggleStudyTask, deleteStudyTask } from "../api";

export default function StudyPlannerScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [deadline, setDeadline] = useState(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getStudyTasks();
      setTasks(Array.isArray(data) ? data : []);
    } catch (e) { Alert.alert("Could not load tasks", e.message); }
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const handleAdd = async () => {
    if (!title.trim()) { Alert.alert("Missing info", "Please enter a task title."); return; }
    setSaving(true);
    try {
      await createStudyTask(title.trim(), subject.trim(), deadline ? deadline.toISOString() : null);
      setTitle(""); setSubject(""); setDeadline(null);
      setShowAdd(false);
      await load();
    } catch (e) { Alert.alert("Could not add task", e.message); }
    finally { setSaving(false); }
  };

  const handleToggle = async (id) => {
    try { await toggleStudyTask(id); await load(); }
    catch (e) { Alert.alert("Could not update task", e.message); }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Task?", "Are you sure you want to delete this task?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteStudyTask(id); await load(); }
        catch (e) { Alert.alert("Could not delete", e.message); }
      }}
    ]);
  };

  const onDateChange = (event, selectedDate) => {
    if (Platform.OS === "android") {
      setShowDatePicker(false); // Android auto-dismisses
      if (event.type === "set" && selectedDate) {
        setDeadline(selectedDate);
      }
    } else {
      // iOS: Update live while scrolling, DON'T close the picker
      if (selectedDate) {
        setDeadline(selectedDate);
      }
    }
  };

  return (
    <SkyBackground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}>
        <View style={styles.headerRow}>
          <Text style={styles.title}>Study Planner</Text>
          <TouchableOpacity onPress={() => setShowAdd(true)} style={styles.addBtn}>
            <Ionicons name="add-circle" size={28} color="#fff" />
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : tasks.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="calendar-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>No tasks yet. Tap the + button to add one.</Text>
          </BlurView>
        ) : (
          tasks.map((t) => (
            <BlurView key={t.taskId} intensity={24} tint="light" style={styles.taskCard}>
              <TouchableOpacity style={styles.taskLeft} onPress={() => handleToggle(t.taskId)}>
                <Ionicons name={t.isCompleted ? "checkmark-circle" : "ellipse-outline"} size={24} color={t.isCompleted ? "#1f9d6b" : "#fff"} />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={[styles.taskTitle, t.isCompleted && styles.taskDone]}>{t.title}</Text>
                <View style={styles.taskMeta}>
                  {t.subject && <View style={styles.subjectPill}><Text style={styles.subjectText}>{t.subject}</Text></View>}
                  {t.deadline && <Text style={styles.deadlineText}>Due: {new Date(t.deadline).toLocaleDateString()}</Text>}
                </View>
              </View>
              <TouchableOpacity onPress={() => handleDelete(t.taskId)}>
                <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
              </TouchableOpacity>
            </BlurView>
          ))
        )}
      </ScrollView>

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <View style={styles.modalOverlay}>
          <BlurView intensity={40} tint="dark" style={styles.modalCard}>
            <Text style={styles.modalTitle}>Add New Task</Text>
            <TextInput style={styles.input} placeholder="Task title" placeholderTextColor="rgba(255,255,255,0.6)" value={title} onChangeText={setTitle} />
            <TextInput style={styles.input} placeholder="Subject (e.g., Math)" placeholderTextColor="rgba(255,255,255,0.6)" value={subject} onChangeText={setSubject} />
            
            <TouchableOpacity style={[styles.input, { justifyContent: "center" }]} onPress={() => setShowDatePicker(true)}>
              <Text style={{ color: deadline ? "#fff" : "rgba(255,255,255,0.6)", fontSize: 14 }}>
                {deadline ? `Due: ${deadline.toLocaleDateString()}` : "Select Deadline (Optional)"}
              </Text>
            </TouchableOpacity>

            {showDatePicker && (
              <View style={styles.datePickerContainer}>
                {Platform.OS === "ios" && (
                  <View style={styles.datePickerHeader}>
                    <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                      <Text style={styles.doneBtnText}>Done</Text>
                    </TouchableOpacity>
                  </View>
                )}
                <DateTimePicker
                  value={deadline || new Date()}
                  mode="date"
                  display={Platform.OS === "ios" ? "spinner" : "default"}
                  onChange={onDateChange}
                  textColor="#ffffff"
                  accentColor="#0b6f8e"
                  style={{ width: "100%" }}
                />
              </View>
            )}

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalBtn, styles.cancelBtn]} onPress={() => { setShowAdd(false); setDeadline(null); setShowDatePicker(false); }} disabled={saving}>
                <Text style={styles.modalBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.modalBtn, styles.saveBtn]} onPress={handleAdd} disabled={saving}>
                {saving ? <ActivityIndicator color="#0b6f8e" /> : <Text style={[styles.modalBtnText, { color: "#0b6f8e" }]}>Add Task</Text>}
              </TouchableOpacity>
            </View>
          </BlurView>
        </View>
      </Modal>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  title: { color: colors.white, fontSize: 22, fontWeight: "600" },
  addBtn: { padding: 4 },
  empty: { borderRadius: 16, padding: 24, alignItems: "center", gap: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
  taskCard: { flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  taskLeft: { padding: 4 },
  taskTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  taskDone: { textDecorationLine: "line-through", color: "rgba(255,255,255,0.5)" },
  taskMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 6 },
  subjectPill: { backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2 },
  subjectText: { color: "#fff", fontSize: 11, fontWeight: "600" },
  deadlineText: { color: "rgba(255,255,255,0.7)", fontSize: 11 },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "center", alignItems: "center", padding: 24 },
  modalCard: { width: "100%", borderRadius: 20, padding: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  modalTitle: { color: "#fff", fontSize: 20, fontWeight: "600", marginBottom: 20, textAlign: "center" },
  input: { backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: "#fff", fontSize: 14, marginBottom: 12 },
  datePickerContainer: { backgroundColor: "rgba(0,0,0,0.3)", borderRadius: 10, marginBottom: 12, paddingBottom: 10 },
  datePickerHeader: { alignItems: "flex-end", padding: 10 },
  doneBtnText: { color: "#0b6f8e", fontSize: 16, fontWeight: "700" },
  modalBtnRow: { flexDirection: "row", gap: 10, marginTop: 8 },
  modalBtn: { flex: 1, paddingVertical: 12, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  cancelBtn: { backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)" },
  saveBtn: { backgroundColor: "#fff" },
  modalBtnText: { color: "#fff", fontWeight: "600", fontSize: 14 }
});