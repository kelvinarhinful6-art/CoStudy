import React, { useState, useEffect, useCallback } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert, Switch } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { getAdminQuestions, createQuestion, updateQuestion, deleteQuestion } from "../api";

export default function AdminVettingScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newText, setNewText] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editText, setEditText] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await getAdminQuestions();
      setQuestions(Array.isArray(data) ? data : []);
    } catch (e) { Alert.alert("Could not load questions", e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      await createQuestion(newText.trim());
      setNewText("");
      await load();
    } catch (e) { Alert.alert("Could not create", e.message); }
    finally { setSaving(false); }
  };

  const handleUpdate = async (id) => {
    if (!editText.trim()) return;
    setSaving(true);
    try {
      await updateQuestion(id, editText.trim(), undefined);
      setEditingId(null);
      setEditText("");
      await load();
    } catch (e) { Alert.alert("Could not update", e.message); }
    finally { setSaving(false); }
  };

  const handleToggleActive = async (q) => {
    try {
      await updateQuestion(q.questionId, q.questionText, !q.active);
      await load();
    } catch (e) { Alert.alert("Could not update", e.message); }
  };

  const handleDelete = (id) => {
    Alert.alert("Delete Question?", "Are you sure you want to delete this question?", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteQuestion(id); await load(); }
        catch (e) { Alert.alert("Could not delete", e.message); }
      }}
    ]);
  };

  return (
    <SkyBackground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={styles.title}>Vetting Questions</Text>
        
        <BlurView intensity={28} tint="light" style={styles.card}>
          <Text style={styles.cardTitle}>Add New Question</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter question text..."
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={newText}
            onChangeText={setNewText}
            multiline
          />
          <TouchableOpacity style={styles.btn} onPress={handleCreate} disabled={saving} activeOpacity={0.85}>
            {saving ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.btnText}>Add Question</Text>}
          </TouchableOpacity>
        </BlurView>

        <Text style={styles.sectionLabel}>Current Questions</Text>
        {loading ? (
          <ActivityIndicator color={colors.white} style={{ marginTop: 24 }} />
        ) : questions.length === 0 ? (
          <Text style={styles.emptyText}>No questions yet. Add your first one above.</Text>
        ) : (
          questions.map((q) => (
            <BlurView key={q.questionId} intensity={24} tint="light" style={styles.qCard}>
              {editingId === q.questionId ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={editText}
                    onChangeText={setEditText}
                    autoFocus
                    multiline
                  />
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.btn, { flex: 1, marginRight: 8 }]} onPress={() => handleUpdate(q.questionId)}>
                      <Text style={styles.btnText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.btn, { flex: 1, backgroundColor: "rgba(255,255,255,0.16)" }]} onPress={() => { setEditingId(null); setEditText(""); }}>
                      <Text style={[styles.btnText, { color: colors.white }]}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <View style={styles.qRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.qText}>{q.questionText}</Text>
                    <View style={styles.statusRow}>
                      <Switch
                        trackColor={{ false: "rgba(255,255,255,0.2)", true: "#0b6f8e" }}
                        thumbColor={q.active ? "#fff" : "#f4f3f4"}
                        ios_backgroundColor="rgba(255,255,255,0.2)"
                        onValueChange={() => handleToggleActive(q)}
                        value={q.active}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                      />
                      <Text style={styles.statusText}>{q.active ? "Active" : "Inactive"}</Text>
                    </View>
                  </View>
                  <View style={styles.iconRow}>
                    <TouchableOpacity onPress={() => { setEditingId(q.questionId); setEditText(q.questionText); }} style={{ marginRight: 12 }}>
                      <Ionicons name="create-outline" size={22} color={colors.white} />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDelete(q.questionId)}>
                      <Ionicons name="trash-outline" size={22} color="#ff4d4d" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </BlurView>
          ))
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  title: { color: colors.white, fontSize: 22, fontWeight: "600", marginBottom: 16 },
  card: { borderRadius: 16, padding: 16, marginBottom: 24, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", overflow: "hidden" },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: "600", marginBottom: 12 },
  input: { backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.white, fontSize: 14, marginBottom: 10, minHeight: 60 },
  btn: { backgroundColor: colors.white, borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  btnText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
  sectionLabel: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  emptyText: { color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 24, fontSize: 14 },
  qCard: { borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", overflow: "hidden" },
  qRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  qText: { color: colors.white, fontSize: 15, marginBottom: 8 },
  statusRow: { flexDirection: "row", alignItems: "center" },
  statusText: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginLeft: 4 },
  iconRow: { flexDirection: "row", alignItems: "center" },
  actionRow: { flexDirection: "row", gap: 8 },
});