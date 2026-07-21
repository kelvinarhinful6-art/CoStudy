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
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { uploadQuestionFile } from "../api";
import type { LocalFile, StackProps } from "../types";

export default function AdminVettingScreen({ navigation }: StackProps<"AdminVetting">) {
  const insets = useSafeAreaInsets();
  const [course, setCourse] = useState("");
  const [file, setFile] = useState<LocalFile | null>(null);
  const [uploading, setUploading] = useState(false);

  const pickFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (!res.canceled && res.assets) setFile(res.assets[0] as LocalFile);
    } catch (e) {
      // ignore
    }
  };

  const handleUpload = async () => {
    if (!course.trim()) {
      Alert.alert("Missing info", "Please enter a course code.");
      return;
    }
    if (!file) {
      Alert.alert("Missing file", "Please choose a PDF/Doc file to upload.");
      return;
    }
    setUploading(true);
    try {
      await uploadQuestionFile(course.trim().toUpperCase(), file);
      Alert.alert("Success", "Question file uploaded successfully!");
      setCourse("");
      setFile(null);
    } catch (e) {
      Alert.alert("Upload failed", (e as Error).message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <SkyBackground>
      <ScrollView contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Subject Assessment</Text>
        </View>

        <BlurView intensity={28} tint="light" style={styles.card}>
          <Text style={styles.cardTitle}>Upload Subject Assessment (PDF)</Text>
          <Text style={styles.cardSub}>
            Upload a PDF with the assessment questions for a course. Applicants download this file, solve it, and upload
            their answers with their CV and transcript. Uploading again replaces the current file.
          </Text>

          <TextInput
            style={styles.input}
            placeholder="Course code (e.g., PHY101)"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={course}
            onChangeText={setCourse}
            autoCapitalize="characters"
          />

          <TouchableOpacity style={styles.fileBtn} onPress={pickFile} activeOpacity={0.85}>
            <Ionicons name="document-attach-outline" size={18} color="#fff" />
            <Text style={styles.fileText}>{file ? file.name : "Choose a file"}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.button} onPress={handleUpload} disabled={uploading} activeOpacity={0.85}>
            {uploading ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Upload Assessment</Text>}
          </TouchableOpacity>
        </BlurView>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 24 },
  title: { color: colors.white, fontSize: 22, fontWeight: "600" },
  card: {
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    overflow: "hidden",
  },
  cardTitle: { color: colors.white, fontSize: 16, fontWeight: "600", marginBottom: 8 },
  cardSub: { color: "rgba(255,255,255,0.7)", fontSize: 13, marginBottom: 16 },
  input: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.white,
    fontSize: 14,
    marginBottom: 12,
  },
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
    marginBottom: 12,
  },
  fileText: { color: "#fff", fontWeight: "600", fontSize: 14 },
  button: { backgroundColor: "#fff", borderRadius: 10, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
});
