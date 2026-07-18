import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, TextInput, TouchableOpacity, ActivityIndicator, Alert } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { getVettingQuestions, submitAttempt, uploadDocument } from "../api";

export default function VettingTestScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { appId } = route.params;
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [cvFile, setCvFile] = useState(null);
  const [ansFile, setAnsFile] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getVettingQuestions(appId);
        setQuestions(data.questions || []);
      } catch (e) { Alert.alert("Could not load questions", e.message); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const pickCv = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!res.canceled && res.assets) setCvFile(res.assets[0]);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const pickAns = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!res.canceled && res.assets) setAnsFile(res.assets[0]);
    } catch (e) { Alert.alert("Error", e.message); }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      // 1. Upload CV if selected
      if (cvFile) {
        await uploadDocument(appId, cvFile);
      }
      // 2. Upload Answers file if selected
      if (ansFile) {
        await uploadDocument(appId, ansFile);
      }
      // 3. Submit text answers
      const formattedAnswers = Object.keys(answers).map(qId => ({ questionId: qId, chosenOption: answers[qId] }));
      const result = await submitAttempt(appId, formattedAnswers);
      
      Alert.alert("Submitted", result.message, [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e) { Alert.alert("Submission failed", e.message); }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (<SkyBackground><View style={styles.loader}><ActivityIndicator color="#fff" /></View></SkyBackground>);
  }

  return (
    <SkyBackground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color="#fff" /></TouchableOpacity>
          <Text style={styles.title}>Tutor Application</Text>
        </View>

        <Text style={styles.sectionTitle}>Upload Documents</Text>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickCv}>
          <Ionicons name="document-attach-outline" size={20} color="#fff" />
          <Text style={styles.uploadText}>{cvFile ? `CV: ${cvFile.name}` : "Upload CV / Resume"}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.uploadBtn} onPress={pickAns}>
          <Ionicons name="document-attach-outline" size={20} color="#fff" />
          <Text style={styles.uploadText}>{ansFile ? `Answers: ${ansFile.name}` : "Upload Answers File (Optional)"}</Text>
        </TouchableOpacity>

        <Text style={styles.sectionTitle}>Vetting Questions</Text>
        {questions.map((q, i) => (
          <BlurView key={q.questionId} intensity={24} tint="light" style={styles.qCard}>
            <Text style={styles.qText}>{i + 1}. {q.prompt}</Text>
            <TextInput
              style={styles.input}
              placeholder="Type your answer here..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={answers[q.questionId] || ""}
              onChangeText={(text) => setAnswers(prev => ({ ...prev, [q.questionId]: text }))}
              multiline
            />
          </BlurView>
        ))}

        <TouchableOpacity style={styles.btn} onPress={handleSubmit} disabled={submitting}>
          {submitting ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.btnText}>Submit Application</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  loader: { flex: 1, justifyContent: "center", alignItems: "center" },
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  title: { color: colors.white, fontSize: 22, fontWeight: "600" },
  sectionTitle: { color: "rgba(255,255,255,0.8)", fontSize: 16, fontWeight: "600", marginBottom: 12, marginTop: 16 },
  uploadBtn: { flexDirection: "row", alignItems: "center", gap: 10, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 10 },
  uploadText: { color: colors.white, fontSize: 14, flex: 1 },
  qCard: { borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.2)", overflow: "hidden" },
  qText: { color: colors.white, fontSize: 16, fontWeight: "600", marginBottom: 12 },
  input: { backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, color: colors.white, fontSize: 14, minHeight: 80 },
  btn: { backgroundColor: colors.white, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 24 },
  btnText: { color: "#0b6f8e", fontWeight: "600", fontSize: 15 }
});