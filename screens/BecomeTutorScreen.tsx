import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as DocumentPicker from "expo-document-picker";
import * as Print from "expo-print";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { BASE_URL, applyTutor, uploadDocument, getQuestionFile, submitApplication } from "../api";
import type { LocalFile, StackProps } from "../types";

export default function BecomeTutorScreen({ navigation, route }: StackProps<"BecomeTutor">) {
  const insets = useSafeAreaInsets();
  const resume = route.params;
  const [stage, setStage] = useState<"apply" | "upload" | "done">(resume?.appId ? "upload" : "apply");
  const [course, setCourse] = useState(resume?.courseId ?? "");
  const [appId, setAppId] = useState<string | null>(resume?.appId ?? null);
  const [questionFileUrl, setQuestionFileUrl] = useState<string | null>(null);
  const [files, setFiles] = useState<LocalFile[]>([]);
  const [busy, setBusy] = useState(false);
  const [viewingAssessment, setViewingAssessment] = useState(false);

  // If we were opened to continue an in-progress application, fetch its assessment (if any).
  React.useEffect(() => {
    if (resume?.appId && resume?.courseId) {
      getQuestionFile(resume.courseId)
        .then((qf) => setQuestionFileUrl(qf && qf.url ? qf.url : null))
        .catch(() => setQuestionFileUrl(null));
    }
  }, []);

  const startApply = async () => {
    if (!course.trim()) {
      Alert.alert("Enter a course", "Type the course code you want to tutor.");
      return;
    }
    setBusy(true);
    try {
      const code = course.trim().toUpperCase();
      const app = await applyTutor(code);
      setAppId(app.applicationId);
      // Fetch the admin-uploaded assessment PDF for this subject (may not exist yet).
      try {
        const qf = await getQuestionFile(code);
        setQuestionFileUrl(qf && qf.url ? qf.url : null);
      } catch {
        setQuestionFileUrl(null);
      }
      setStage("upload");
    } catch (e) {
      Alert.alert("Could not apply", (e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const viewAssessment = async () => {
    if (!questionFileUrl) return;
    setViewingAssessment(true);
    try {
      await Print.printAsync({ uri: `${BASE_URL}${questionFileUrl}` });
    } catch (e) {
      Alert.alert("Could not open assessment", (e as Error).message);
    } finally {
      setViewingAssessment(false);
    }
  };

  const addFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!res.canceled && res.assets) {
        setFiles((prev) => [...prev, res.assets[0] as LocalFile]);
      }
    } catch {
      // ignore
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const submitDocs = async () => {
    if (!appId) return;
    if (files.length === 0) {
      Alert.alert("Add your documents", "Upload your solved assessment together with your CV, transcript, and any supporting documents.");
      return;
    }
    setBusy(true);
    try {
      for (const f of files) {
        await uploadDocument(appId, f);
      }
      await submitApplication(appId);
      setStage("done");
    } catch (e) {
      Alert.alert("Submission failed", (e as Error).message);
    } finally {
      setBusy(false);
    }
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
            <Text style={styles.cardSub}>
              Choose the course you want to tutor. You'll download an assessment, solve it, and upload it with your
              supporting documents for admin review.
            </Text>
            <View style={styles.inputRow}>
              <Ionicons name="book-outline" size={18} color="rgba(255,255,255,0.9)" />
              <TextInput
                style={styles.input}
                placeholder="Course code (e.g. PHY101)"
                placeholderTextColor="rgba(255,255,255,0.6)"
                value={course}
                onChangeText={setCourse}
                autoCapitalize="characters"
              />
            </View>
            <TouchableOpacity style={styles.button} onPress={startApply} disabled={busy} activeOpacity={0.85}>
              {busy ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Start application</Text>}
            </TouchableOpacity>
          </BlurView>
        )}

        {stage === "upload" && (
          <>
            {/* Instructions */}
            <BlurView intensity={30} tint="light" style={styles.card}>
              <Ionicons name="list-circle" size={30} color="#fff" />
              <Text style={styles.cardTitle}>How to apply for {course}</Text>
              <View style={styles.steps}>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNum}>1</Text>
                  <Text style={styles.stepText}>Download and read the assessment PDF for this subject.</Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNum}>2</Text>
                  <Text style={styles.stepText}>Solve the questions in the assessment.</Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNum}>3</Text>
                  <Text style={styles.stepText}>
                    Include your answers in the same file (or package) as your CV, transcript, and any other documents
                    that prove your qualifications.
                  </Text>
                </View>
                <View style={styles.stepRow}>
                  <Text style={styles.stepNum}>4</Text>
                  <Text style={styles.stepText}>Upload the completed file(s) below, then submit your application.</Text>
                </View>
              </View>
            </BlurView>

            {/* Download assessment */}
            <BlurView intensity={30} tint="light" style={styles.card}>
              <Text style={styles.cardTitle}>Assessment questions</Text>
              {questionFileUrl ? (
                <>
                  <Text style={styles.cardSub}>Download the assessment, solve it, and include your answers with your documents.</Text>
                  <TouchableOpacity style={styles.fileBtn} onPress={viewAssessment} disabled={viewingAssessment} activeOpacity={0.85}>
                    {viewingAssessment ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <Ionicons name="eye-outline" size={18} color="#fff" />
                        <Text style={styles.fileText}>View Assessment PDF</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <Text style={styles.cardSub}>
                  No assessment has been published for this subject yet. You can still upload your CV, transcript, and
                  supporting documents for review.
                </Text>
              )}
            </BlurView>

            {/* Upload documents */}
            <BlurView intensity={30} tint="light" style={styles.card}>
              <Ionicons name="cloud-upload" size={30} color="#fff" />
              <Text style={styles.cardTitle}>Upload your documents</Text>
              <Text style={styles.cardSub}>
                Add your solved assessment, CV/Resume, transcript, and any other supporting files.
              </Text>

              {files.map((f, i) => (
                <View key={i} style={styles.fileItem}>
                  <Ionicons name="document-text-outline" size={18} color="#fff" />
                  <Text style={styles.fileItemName} numberOfLines={1}>
                    {f.name || `Document ${i + 1}`}
                  </Text>
                  <TouchableOpacity onPress={() => removeFile(i)}>
                    <Ionicons name="close-circle" size={20} color="rgba(255,255,255,0.85)" />
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity style={styles.fileBtn} onPress={addFile} activeOpacity={0.85}>
                <Ionicons name="document-attach-outline" size={18} color="#fff" />
                <Text style={styles.fileText}>{files.length > 0 ? "Add another file" : "Choose a file"}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={submitDocs} disabled={busy} activeOpacity={0.85}>
                {busy ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Submit Application</Text>}
              </TouchableOpacity>
            </BlurView>
          </>
        )}

        {stage === "done" && (
          <BlurView intensity={30} tint="light" style={styles.card}>
            <Ionicons name="checkmark-circle" size={40} color="#fff" />
            <Text style={styles.cardTitle}>Application submitted</Text>
            <Text style={styles.cardSub}>
              Your documents, including your assessment answers, are now under review by our team. You'll become a
              bookable tutor for this course once an admin approves your application.
            </Text>
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
  card: {
    borderRadius: 20,
    padding: 22,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginBottom: 16,
  },
  cardTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 4, textAlign: "center" },
  cardSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  steps: { alignSelf: "stretch", gap: 12, marginTop: 6 },
  stepRow: { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  stepNum: {
    color: "#0b6f8e",
    backgroundColor: "#fff",
    width: 24,
    height: 24,
    borderRadius: 12,
    textAlign: "center",
    lineHeight: 24,
    fontWeight: "700",
    fontSize: 13,
    overflow: "hidden",
  },
  stepText: { color: "rgba(255,255,255,0.9)", fontSize: 14, lineHeight: 20, flex: 1 },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginTop: 8,
  },
  input: { flex: 1, color: "#fff", fontSize: 14 },
  button: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    marginTop: 12,
    alignSelf: "stretch",
  },
  buttonText: { color: "#0b6f8e", fontWeight: "600", fontSize: 15 },
  fileBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    marginTop: 8,
    marginBottom: 4,
  },
  fileText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  fileItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.12)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
  },
  fileItemName: { color: "#fff", fontSize: 14, flex: 1 },
});
