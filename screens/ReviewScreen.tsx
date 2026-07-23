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
import { createReview, updateReview } from "../api";
import type { StackProps } from "../types";

export default function ReviewScreen({ route, navigation }: StackProps<"Review">) {
  const insets = useSafeAreaInsets();
  const { bookingId, tutorName, existingReviewId, initialRating, initialComment } = route.params;
  const [rating, setRating] = useState(initialRating || 0);
  const [comment, setComment] = useState(initialComment || "");
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (rating < 1) {
      Alert.alert("Rate the session", "Please tap a star to rate your tutor.");
      return;
    }
    const trimmed = comment.trim();
    if (trimmed.length > 0 && trimmed.length < 5) {
      Alert.alert("Review too short", "Please enter at least 5 characters for your review.");
      return;
    }
    if (trimmed.length > 500) {
      Alert.alert("Review too long", "Review comment cannot exceed 500 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (existingReviewId) {
        await updateReview(existingReviewId, rating, trimmed);
        Alert.alert("Updated! 🎉", "Your review has been updated successfully.");
      } else {
        await createReview(bookingId, rating, trimmed);
        Alert.alert("Thanks! 🎉", "Your review was submitted successfully.");
      }
      if (navigation.canGoBack()) navigation.goBack();
    } catch (e) {
      Alert.alert("Could not save review", (e as Error).message);
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
          <Text style={styles.cardLabel}>Your rating (1 to 5 stars)</Text>
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

          <View style={styles.labelRow}>
            <Text style={styles.cardLabel}>Your review</Text>
            <Text style={styles.charCount}>{comment.length}/500</Text>
          </View>
          <TextInput
            style={styles.input}
            placeholder="Share your experience (min 5 characters)"
            placeholderTextColor="rgba(255,255,255,0.6)"
            value={comment}
            onChangeText={setComment}
            maxLength={500}
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
              <Text style={styles.btnText}>Submit Review</Text>
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
  labelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  charCount: { color: "rgba(255,255,255,0.6)", fontSize: 12 },
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
