import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import SkyBackground from "./SkyBackground";
import { colors } from "../theme";
import { createReview } from "../api";
import type { StackProps } from "../types";

export default function ReviewScreen({ route, navigation }: StackProps<"Review">) {
  const insets = useSafeAreaInsets();
  const { bookingId, tutorName } = route.params;
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      Alert.alert("Rate the session", "Please tap a star to rate your tutor.");
      return;
    }
    setSubmitting(true);
    try {
      await createReview(bookingId, rating, comment.trim());
      Alert.alert("Thanks!", "Your review was submitted.");
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      Alert.alert("Could not submit review", (e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Rate your tutor</Text>
        </View>
        <Text style={styles.sub}>
          {tutorName ? `How was your session with ${tutorName}?` : "How was your session?"}
        </Text>

        <BlurView intensity={28} tint="light" style={styles.card}>
          <Text style={styles.cardLabel}>Your rating</Text>
          <View style={styles.stars}>
            {[1, 2, 3, 4, 5].map((n) => (
              <TouchableOpacity key={n} onPress={() => setRating(n)} activeOpacity={0.7}>
                <Ionicons
                  name={n <= rating ? "star" : "star-outline"}
                  size={40}
                  color={n <= rating ? "#ffd166" : "rgba(255,255,255,0.7)"}
                />
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.cardLabel}>Your review</Text>
          <TextInput
            style={styles.input}
            placeholder="Share what went well (optional)"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={comment}
            onChangeText={setComment}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
          />

          <TouchableOpacity
            style={styles.btn}
            onPress={submit}
            disabled={submitting}
            activeOpacity={0.85}
          >
            {submitting ? (
              <ActivityIndicator color="#0b6f8e" />
            ) : (
              <Text style={styles.btnText}>Submit review</Text>
            )}
          </TouchableOpacity>
        </BlurView>
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  sub: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 18 },
  card: {
    borderRadius: 18,
    padding: 18,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  cardLabel: { color: "#fff", fontSize: 14, fontWeight: "600", marginBottom: 10, marginTop: 6 },
  stars: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  input: {
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: "#fff",
    fontSize: 14,
    minHeight: 96,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: colors.white,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
  },
  btnText: { color: "#0b6f8e", fontWeight: "600", fontSize: 15 },
});
