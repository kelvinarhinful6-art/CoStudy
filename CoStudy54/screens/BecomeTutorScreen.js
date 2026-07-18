import React, { useState } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { applyTutor, getVettingQuestions, submitAttempt, uploadDocument } from "../api";

export default function BecomeTutorScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const [stage, setStage] = useState("apply"); // apply | test | done
  const [course, setCourse] = useState("");
  const [appId, setAppId] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [cvFile, setCvFile] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const startApply = async () => {
    if (!course.trim()) { Alert.alert("Enter a course", "Type the course code you want to tutor."); return; }
    setBusy(true);
    try {
      const app = await applyTutor(course.trim().toUpperCase());
      setAppId(app.applicationId);
      const qv = await getVettingQuestions(app.applicationId);
      const qs = (qv.questions || []);
      if (qs.length === 0) { 
        Alert.alert("No test available", "There are no vetting questions configured by the admin yet."); 
        setBusy(false); 
        return; 
      }
      setQuestions(qs);
      setStage("test");
    } catch (e) {
      Alert.alert("Could not apply", e.message);
    } finally { setBusy(false); }
  };

  const pickCv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!res.canceled && res.assets) setCvFile(res.assets[0]);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const pickProof = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!res.canceled && res.assets) setProofFile(res.assets[0]);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const submitTest = async () => {
    setBusy(true);
    try {
      // 1. Upload CV if selected
      if (cvFile) await uploadDocument(appId, cvFile);
      // 2. Upload Proof if selected
      if (proofFile) await uploadDocument(appId, proofFile);
      
      // 3. Submit text answers
      const payload = questions.map((q) => ({ questionId: q.questionId, chosenOption: answers[q.questionId] || "" }));
      const result = await submitAttempt(appId, payload);
      
      setStage("done");
    } catch (e) {
      Alert.alert("Could not submit", e.message);
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
            <Text style={styles.cardSub}>Choose the course you want to tutor. You will answer a few questions and upload your CV/Proof.</Text>
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
            <Text style={styles.sectionTitle}>Upload Documents</Text>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickCv}>
              <Ionicons name="document-attach-outline" size={20} color="#fff" />
              <Text style={styles.uploadText}>{cvFile ? `CV: ${cvFile.name}` : "Upload CV / Resume"}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.uploadBtn} onPress={pickProof}>
              <Ionicons name="document-attach-outline" size={20} color="#fff" />
              <Text style={styles.uploadText}>{proofFile ? `Proof: ${proofFile.name}` : "Upload Proof (Transcript, Cert)"}</Text>
            </TouchableOpacity>

            <Text style={styles.sectionTitle}>Vetting Questions</Text>
            {questions.map((q, idx) => (
              <BlurView key={q.questionId} intensity={26} tint="light" style={styles.qCard}>
                <Text style={styles.qPrompt}>{idx + 1}. {q.prompt}</Text>
                <TextInput
                  style={styles.textArea}
                  placeholder="Type your answer here..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={answers[q.questionId] || ""}
                  onChangeText={(text) => setAnswers(prev => ({ ...prev, [q.questionId]: text }))}
                  multiline
                />
              </BlurView>
            ))}
            <TouchableOpacity style={styles.button} onPress={submitTest} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Submit Application</Text>}
            </TouchableOpacity>
          </>
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
  title: { color: colors.white, fontSize: 22, fontWeight: "600" },
  card: { borderRadius: 20, padding: 22, alignItems: "center", gap: 10, overflow: "hidden", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)" },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 4, textAlign: "center" },
  cardSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  inputRow: { flexDirection: "row", alignItems: "center", gap: 8, alignSelf: "stretch", backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.22)", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 11, marginTop: 8 },
  input: { flex: 1, color: "#fff", fontSize: 14 },
  button: { backgroundColor: "#fff", borderRadius: 12, paddingVertical: 13, paddingHorizontal: 24, alignItems: "center", justifyContent: "center", minHeight: 46, marginTop: 12, alignSelf: "stretch" },
  buttonText: { color: "#0b6f8e", fontWeight: "600", fontSize: 15 },
  sectionTitle: { color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: "600", marginBottom: 12, marginTop: 16 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  uploadText: { color: colors.white, fontSize: 14, flex: 1 },
  qCard: { borderRadius: 16, padding: 16, overflow: "hidden", marginBottom: 12, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)" },
  qPrompt: { color: "#fff", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  textArea: { backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.white, fontSize: 14, minHeight: 80 }
});