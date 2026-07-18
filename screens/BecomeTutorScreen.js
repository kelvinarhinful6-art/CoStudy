import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import SkyBackground from "./SkyBackground";
import { applyTutor, getVettingQuestions, submitAttempt, uploadDocument } from "../api";

export default function BecomeTutorScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState("apply"); // apply | test | upload | done
  const [course, setCourse] = useState("");
  const [appId, setAppId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(null);

  const startApply = async () => {
    if (!course.trim()) { Alert.alert("Enter a course", "Type the course code you want to tutor."); return; }
    setBusy(true);
    try {
      const app = await applyTutor(course.trim().toUpperCase());
      setAppId(app.applicationId);
      const qv = await getVettingQuestions(app.applicationId);
      const qs = (qv.questions || []);
      if (qs.length === 0) { Alert.alert("No test available", "There are no vetting questions for this course yet. Ask an admin to add them."); setBusy(false); return; }
      setQuestions(qs);
      setStage("test");
    } catch (e) {
      Alert.alert("Could not apply", e.message);
    } finally { setBusy(false); }
  };

  const pick = (qid, opt) => setAnswers((m) => ({ ...m, [qid]: opt }));

  const submitTest = async () => {
    if (Object.keys(answers).length < questions.length) {
      Alert.alert("Answer all questions", "Please choose an option for every question.");
      return;
    }
    setBusy(true);
    try {
      const payload = questions.map((q) => ({ questionId: q.questionId, chosenOption: answers[q.questionId] }));
      const result = await submitAttempt(appId, payload);
      setScore(result.scorePct != null ? result.scorePct : result.score);
      if (result.passed) {
        setStage("upload");
      } else {
        Alert.alert("Not passed", `You scored ${result.scorePct != null ? result.scorePct : ""}%. You need 95% to pass. ${result.attemptsLeft != null ? "Attempts left: " + result.attemptsLeft : ""}`);
      }
    } catch (e) {
      Alert.alert("Could not submit test", e.message);
    } finally { setBusy(false); }
  };

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ copyToCacheDirectory: true });
      if (res.canceled) return;
      const f = res.assets ? res.assets[0] : res;
      setFile(f);
    } catch (e) { Alert.alert("Could not pick file", e.message); }
  };

  const submitDoc = async () => {
    if (!file) { Alert.alert("Choose a file", "Upload a document that proves you can tutor this course."); return; }
    setBusy(true);
    try {
      await uploadDocument(appId, file);
      setStage("done");
    } catch (e) {
      Alert.alert("Upload failed", e.message);
    } finally { setBusy(false); }
  };

  return (
    <SkyBackground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Become a Tutor</Text>
        </View>

        {stage === "apply" && (
          <BlurView intensity={30} tint="light" style={styles.card}>
            <Ionicons name="school" size={30} color="#fff" />
            <Text style={styles.cardTitle}>Apply to tutor</Text>
            <Text style={styles.cardSub}>Choose the course you want to tutor. You will take a short test (95% to pass) and upload proof of your knowledge.</Text>
            <View style={styles.inputRow}>
              <Ionicons name="book-outline" size={18} color="rgba(255,255,255,0.9)" />
              <TextInput style={styles.input} placeholder="Course code (e.g. PHY101)" placeholderTextColor="rgba(255,255,255,0.6)" value={course} onChangeText={setCourse} autoCapitalize="characters" />
            </View>
            <TouchableOpacity style={styles.button} onPress={startApply} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Start application</Text>}
            </TouchableOpacity>
          </BlurView>
        )}

        {stage === "test" && (
          <>
            <Text style={styles.stageNote}>Answer all questions. You need 95% to pass.</Text>
            {questions.map((q, idx) => (
              <BlurView key={q.questionId} intensity={26} tint="light" style={styles.qCard}>
                <Text style={styles.qPrompt}>{idx + 1}. {q.prompt}</Text>
                {[["A", q.optionA], ["B", q.optionB], ["C", q.optionC], ["D", q.optionD]].map(([opt, label]) => {
                  const sel = answers[q.questionId] === opt;
                  return (
                    <TouchableOpacity key={opt} style={[styles.opt, sel && styles.optSel]} onPress={() => pick(q.questionId, opt)}>
                      <View style={[styles.optDot, sel && styles.optDotSel]}>{sel && <Ionicons name="checkmark" size={13} color="#0b6f8e" />}</View>
                      <Text style={styles.optText}>{label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </BlurView>
            ))}
            <TouchableOpacity style={styles.button} onPress={submitTest} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Submit test</Text>}
            </TouchableOpacity>
          </>
        )}

        {stage === "upload" && (
          <BlurView intensity={30} tint="light" style={styles.card}>
            <Ionicons name="cloud-upload" size={30} color="#fff" />
            <Text style={styles.cardTitle}>You passed{score != null ? ` (${score}%)` : ""}!</Text>
            <Text style={styles.cardSub}>Upload a document that proves you are fit to tutor this course (certificate, transcript, etc.).</Text>
            <TouchableOpacity style={styles.fileBtn} onPress={pickFile} activeOpacity={0.85}>
              <Ionicons name="document-attach-outline" size={18} color="#fff" />
              <Text style={styles.fileText}>{file ? file.name : "Choose a file"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.button} onPress={submitDoc} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Submit application</Text>}
            </TouchableOpacity>
          </BlurView>
        )}

        {stage === "done" && (
          <BlurView intensity={30} tint="light" style={styles.card}>
            <Ionicons name="checkmark-circle" size={40} color="#fff" />
            <Text style={styles.cardTitle}>Application submitted</Text>
            <Text style={styles.cardSub}>Your application is now under review. An admin will approve it soon. You will become a bookable tutor once approved.</Text>
            <TouchableOpacity style={styles.button} onPress={() => navigation.goBack()} activeOpacity={0.85}>
              <Text style={styles.buttonText}>Back to profile</Text>
            </TouchableOpacity>
          </BlurView>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 18 },
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  card: { borderRadius: 20, padding: 22, alignItems: "center", gap: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 4, textAlign: "center" },
  cardSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginTop: 8 },
  input: { flex: 1, color: "#fff", fontSize: 14 },
  button: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", minHeight: 46, marginTop: 12, alignSelf: "stretch" },
  buttonText: { color: "#0b6f8e", fontWeight: "600", fontSize: 15 },
  stageNote: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 12 },
  qCard: { borderRadius: 16, padding: 16, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  qPrompt: { color: "#fff", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  opt: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 9, paddingHorizontal: 10, borderRadius: 10, marginBottom: 7, backgroundColor: "rgba(255,255,255,0.10)", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  optSel: { backgroundColor: "rgba(255,255,255,0.85)" },
  optDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.7)", alignItems: "center", justifyContent: "center" },
  optDotSel: { backgroundColor: "#fff", borderColor: "#fff" },
  optText: { flex: 1, color: "#0b3a4a", fontSize: 14, fontWeight: "500" },
  fileBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, alignSelf: "stretch", paddingVertical: 12, borderRadius: 12, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", marginTop: 8 },
  fileText: { color: "#fff", fontWeight: "600", fontSize: 14 },
});
