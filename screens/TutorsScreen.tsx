import React, { useState, useCallback, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  RefreshControl,
  Linking,
  AppState,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import {
  session,
  proStatus,
  proPlan,
  subscribePro,
  listTutors,
  bookTutor,
  listUsers,
  initiatePayment,
  verifyPayment,
  confirmBookingPayment,
  tutorReviews,
  deleteReview,
  updateReview,
} from "../api";
import type { Plan, User, TutorReviewsData, Review } from "../types";

const HOUR_OPTIONS = [1, 2, 3];

export default function TutorsScreen() {
  const insets = useSafeAreaInsets();
  const [isPro, setIsPro] = useState(false);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [checking, setChecking] = useState(true);
  const [subscribing, setSubscribing] = useState(false);
  const [course, setCourse] = useState("");
  const [tutors, setTutors] = useState<string[]>([]);
  const [usersById, setUsersById] = useState<Record<string, User>>({});
  const [reviewsByTutor, setReviewsByTutor] = useState<Record<string, TutorReviewsData>>({});
  const [expandedReviews, setExpandedReviews] = useState<Record<string, boolean>>({});
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [hoursByTutor, setHoursByTutor] = useState<Record<string, number>>({});
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const pendingPaymentRef = useRef<{ ref: string; type: "pro" | "booking"; bookingId?: string } | null>(null);

  const fetchTutorReviews = async (tutorIds: string[]) => {
    const map: Record<string, TutorReviewsData> = {};
    await Promise.all(
      tutorIds.map(async (tid) => {
        try {
          const res = await tutorReviews(tid);
          if (res) map[tid] = res;
        } catch (_) {
          // ignore error per tutor
        }
      })
    );
    setReviewsByTutor((prev) => ({ ...prev, ...map }));
  };

  const loadStatus = useCallback(async () => {
    try {
      const [s, p, users] = await Promise.all([proStatus(), proPlan(), listUsers()]);
      setIsPro(!!s.active);
      setPlan(p);
      const map: Record<string, User> = {};
      (Array.isArray(users) ? users : []).forEach((u: User) => {
        map[u.userId] = u;
      });
      setUsersById(map);

      if (s.active) {
        try {
          const data = await listTutors("");
          const meId = session.user ? session.user.userId : null;
          const filtered = (Array.isArray(data) ? data : []).filter((id: string) => id !== meId);
          setTutors(filtered);
          setSearched(true);
          fetchTutorReviews(filtered);
        } catch (_) {
          // silent fallback
        }
      }
    } catch (e) {
      // ignore status load errors
    } finally {
      setChecking(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadStatus();
    }, [loadStatus])
  );

  useEffect(() => {
    const sub = AppState.addEventListener("change", async (nextAppState) => {
      if (nextAppState === "active" && pendingPaymentRef.current) {
        const { ref, type, bookingId: pendingBId } = pendingPaymentRef.current;
        pendingPaymentRef.current = null;
        try {
          const verifyRes = await verifyPayment(ref);
          const status = (verifyRes && verifyRes.status) ? String(verifyRes.status).toUpperCase() : "";
          if (status === "SUCCESS") {
            if (type === "pro") {
              await subscribePro();
              await loadStatus();
              Alert.alert("Welcome to Pro!", "Your Pro subscription is now active.");
            } else if (type === "booking" && pendingBId) {
              await confirmBookingPayment(pendingBId, ref);
              Alert.alert("Booking Confirmed!", "Your booking has been verified and confirmed.");
            }
          } else {
            Alert.alert("Payment not completed", "Your payment could not be verified or was abandoned. Please try again.");
          }
        } catch (err) {
          Alert.alert("Verification Notice", "Could not verify payment automatically. Please check your bookings status.");
        }
      }
    });
    return () => sub.remove();
  }, [loadStatus]);

  const onRefresh = () => {
    setRefreshing(true);
    loadStatus();
  };

  const handleSubscribe = () => {
    const priceText = plan ? `${plan.price} ${plan.currency}` : "Subscription";
    Alert.alert(
      "Upgrade to Pro",
      `${priceText} — Unlock all premium tutoring features & priority matching.\n\nWould you like to continue to checkout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue to Payment",
          onPress: async () => {
            setSubscribing(true);
            try {
              const priceNum = plan && plan.price ? Number(plan.price) : 0;
              const amountKobo = Math.round(priceNum * 100);
              const email = (session.user && session.user.email) || "guest@costudy.com";
              const payment = await initiatePayment(amountKobo, "pro_subscription", email);
              pendingPaymentRef.current = { ref: payment.reference, type: "pro" };
              await Linking.openURL(payment.authorizationUrl);
            } catch (e) {
              pendingPaymentRef.current = null;
              Alert.alert("Upgrade failed", (e as Error).message);
            } finally {
              setSubscribing(false);
            }
          },
        },
      ]
    );
  };

  const handleSearch = async () => {
    setSearching(true);
    setSearched(true);
    try {
      const data = await listTutors(course.trim().toUpperCase());
      const meId = session.user ? session.user.userId : null;
      const filtered = (Array.isArray(data) ? data : []).filter((tutorId: string) => tutorId !== meId);
      setTutors(filtered);
      fetchTutorReviews(filtered);
    } catch (e) {
      setTutors([]);
      Alert.alert("Could not load tutors", (e as Error).message);
    } finally {
      setSearching(false);
    }
  };

  const setHours = (tutorId: string, h: number) => setHoursByTutor((m) => ({ ...m, [tutorId]: h }));

  const toggleExpand = (tutorId: string) => {
    setExpandedReviews((prev) => ({ ...prev, [tutorId]: !prev[tutorId] }));
  };

  const handleDeleteReview = (review: Review, tutorId: string) => {
    const revId = review.reviewId || review.id;
    if (!revId) return;
    Alert.alert(
      "Delete Review",
      "Are you sure you want to delete your review?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteReview(revId);
              await fetchTutorReviews([tutorId]);
              Alert.alert("Review Deleted", "Your review has been removed.");
            } catch (e) {
              Alert.alert("Could not delete review", (e as Error).message);
            }
          },
        },
      ]
    );
  };

  const handleEditReviewPrompt = (review: Review, tutorId: string) => {
    const revId = review.reviewId || review.id;
    if (!revId) return;
    Alert.prompt(
      "Edit Review",
      "Update your review comment below:",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Save Changes",
          onPress: async (text?: string) => {
            if (!text || text.trim().length < 5) {
              Alert.alert("Invalid text", "Review comment must be at least 5 characters long.");
              return;
            }
            try {
              await updateReview(revId, review.rating || 5, text.trim());
              await fetchTutorReviews([tutorId]);
              Alert.alert("Review Updated", "Your changes have been saved.");
            } catch (e) {
              Alert.alert("Could not update review", (e as Error).message);
            }
          },
        },
      ],
      "plain-text",
      review.comment || ""
    );
  };

  const handleBook = (tutorId: string) => {
    const hours = hoursByTutor[tutorId] || 1;
    const userInfo = usersById[tutorId];
    const displayName = userInfo ? userInfo.tutorDisplayName || userInfo.username : "Tutor";

    Alert.alert(
      "Confirm Booking",
      `Book ${displayName} for ${hours} hour(s) in ${course.trim().toUpperCase() || "Tutoring"}.\n\nProceed to Paystack payment checkout?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Continue to Payment",
          onPress: async () => {
            setBookingId(tutorId);
            try {
              const b = await bookTutor(tutorId, course.trim().toUpperCase(), hours);
              const amountKobo = Math.round((b.grossAmount || 0) * 100);
              const email = (session.user && session.user.email) || "guest@costudy.com";
              const payment = await initiatePayment(amountKobo, "tutoring_booking", email);
              pendingPaymentRef.current = { ref: payment.reference, type: "booking", bookingId: b.bookingId };
              await Linking.openURL(payment.authorizationUrl);
            } catch (e) {
              pendingPaymentRef.current = null;
              Alert.alert("Booking failed", (e as Error).message);
            } finally {
              setBookingId(null);
            }
          },
        },
      ]
    );
  };

  if (checking) {
    return (
      <SkyBackground>
        <View style={styles.loaderWrap}>
          <ActivityIndicator color="#fff" />
        </View>
      </SkyBackground>
    );
  }

  const currentUserId = session.user ? session.user.userId : "";

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 90 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <Text style={styles.title}>Find a Tutor</Text>
        {!isPro ? (
          <BlurView intensity={30} tint="light" style={styles.paywall}>
            <Ionicons name="lock-closed" size={30} color="#fff" />
            <Text style={styles.paywallTitle}>Tutors are a Pro feature</Text>
            <Text style={styles.paywallSub}>
              Unlock unlimited tutor access, priority matching and an ad-free experience.
            </Text>
            {plan && (
              <Text style={styles.price}>
                {plan.price} {plan.currency} / {plan.months === 1 ? "month" : plan.months + " months"}
              </Text>
            )}
            <TouchableOpacity style={styles.button} onPress={handleSubscribe} disabled={subscribing} activeOpacity={0.85}>
              {subscribing ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Upgrade to Pro</Text>}
            </TouchableOpacity>
          </BlurView>
        ) : (
          <>
            <View style={styles.proBadge}>
              <Ionicons name="star" size={13} color="#0b6f8e" />
              <Text style={styles.proBadgeText}>Pro</Text>
            </View>
            <BlurView intensity={28} tint="light" style={styles.searchCard}>
              <View style={styles.inputRow}>
                <Ionicons name="search-outline" size={18} color="rgba(255,255,255,0.9)" />
                <TextInput
                  style={styles.input}
                  placeholder="Filter by course (e.g. PHY101)"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  value={course}
                  onChangeText={setCourse}
                  autoCapitalize="characters"
                  returnKeyType="search"
                  onSubmitEditing={handleSearch}
                />
              </View>
              <TouchableOpacity style={styles.button} onPress={handleSearch} disabled={searching} activeOpacity={0.85}>
                {searching ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.buttonText}>Search Tutors</Text>}
              </TouchableOpacity>
            </BlurView>
            {searched && !searching && tutors.length === 0 && (
              <BlurView intensity={20} tint="light" style={styles.empty}>
                <Ionicons name="school-outline" size={28} color="rgba(255,255,255,0.85)" />
                <Text style={styles.emptyText}>No tutors found for this course yet.</Text>
              </BlurView>
            )}
            {tutors.map((tutorIdItem) => {
              const userInfo = usersById[tutorIdItem];
              const displayName = userInfo ? userInfo.tutorDisplayName || userInfo.username : "Tutor";
              const email = userInfo ? userInfo.email : "";
              const revData = reviewsByTutor[tutorIdItem];
              const avgRating = revData ? revData.averageRating : 0;
              const totalReviews = revData ? revData.count : 0;
              const isExpanded = !!expandedReviews[tutorIdItem];
              const dist = revData?.ratingDistribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

              return (
                <BlurView key={tutorIdItem} intensity={26} tint="light" style={styles.tutorCard}>
                  <View style={styles.tutorHead}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={20} color="#0b6f8e" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.tutorName}>{displayName}</Text>
                      <Text style={styles.tutorCourse}>
                        {course.trim().toUpperCase() || "General Tutoring"} {email ? `| ${email}` : ""}
                      </Text>
                    </View>
                  </View>

                  {/* Rating & Reviews Header */}
                  <TouchableOpacity style={styles.ratingHeaderRow} onPress={() => toggleExpand(tutorIdItem)}>
                    <View style={styles.starRow}>
                      <Ionicons name="star" size={16} color="#ffd166" />
                      <Text style={styles.ratingText}>
                        {avgRating > 0 ? avgRating.toFixed(1) : "New"}
                      </Text>
                      <Text style={styles.reviewCountText}>({totalReviews} reviews)</Text>
                    </View>
                    <View style={styles.viewReviewsBtn}>
                      <Text style={styles.viewReviewsText}>{isExpanded ? "Hide Feedback" : "View Feedback"}</Text>
                      <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={14} color="#fff" />
                    </View>
                  </TouchableOpacity>

                  {/* Expanded Rating Breakdown & Reviews */}
                  {isExpanded && (
                    <View style={styles.expandedSection}>
                      <Text style={styles.breakdownTitle}>Rating Distribution</Text>
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = dist[star] || 0;
                        const pct = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                        return (
                          <View key={star} style={styles.distRow}>
                            <Text style={styles.starLabel}>{star}★</Text>
                            <View style={styles.distTrack}>
                              <View style={[styles.distFill, { width: `${pct}%` }]} />
                            </View>
                            <Text style={styles.distCount}>{count}</Text>
                          </View>
                        );
                      })}

                      <Text style={[styles.breakdownTitle, { marginTop: 14 }]}>Student Reviews</Text>
                      {(!revData?.reviews || revData.reviews.length === 0) ? (
                        <Text style={styles.noReviewsText}>No reviews written for this tutor yet.</Text>
                      ) : (
                        revData.reviews.map((r, rIdx) => {
                          const isMine = r.studentId === currentUserId;
                          return (
                            <View key={r.reviewId || r.id || rIdx} style={styles.reviewCard}>
                              <View style={styles.reviewCardHead}>
                                <View style={{ flexDirection: "row", gap: 2 }}>
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <Ionicons
                                      key={s}
                                      name="star"
                                      size={12}
                                      color={s <= (r.rating || 5) ? "#ffd166" : "rgba(255,255,255,0.3)"}
                                    />
                                  ))}
                                </View>
                                {isMine && (
                                  <View style={styles.actionBtnsRow}>
                                    <TouchableOpacity onPress={() => handleEditReviewPrompt(r, tutorIdItem)}>
                                      <Ionicons name="create-outline" size={14} color="#fff" />
                                    </TouchableOpacity>
                                    <TouchableOpacity onPress={() => handleDeleteReview(r, tutorIdItem)}>
                                      <Ionicons name="trash-outline" size={14} color="#ef4444" />
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                              {!!r.comment && <Text style={styles.reviewComment}>{r.comment}</Text>}
                            </View>
                          );
                        })
                      )}
                    </View>
                  )}

                  <Text style={styles.pickLabel}>Session length</Text>
                  <View style={styles.hoursRow}>
                    {HOUR_OPTIONS.map((h) => {
                      const sel = (hoursByTutor[tutorIdItem] || 1) === h;
                      return (
                        <TouchableOpacity
                          key={h}
                          style={[styles.hourChip, sel && styles.hourChipSel]}
                          onPress={() => setHours(tutorIdItem, h)}
                        >
                          <Text style={[styles.hourText, sel && styles.hourTextSel]}>{h} hr</Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  <TouchableOpacity
                    style={styles.bookBtn}
                    onPress={() => handleBook(tutorIdItem)}
                    disabled={bookingId === tutorIdItem}
                    activeOpacity={0.85}
                  >
                    {bookingId === tutorIdItem ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.bookText}>Book session</Text>
                    )}
                  </TouchableOpacity>
                </BlurView>
              );
            })}
          </>
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center" },
  title: { color: "#fff", fontSize: 24, fontWeight: "600", marginBottom: 16 },
  paywall: {
    borderRadius: 20,
    padding: 24,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  paywallTitle: { color: "#fff", fontSize: 18, fontWeight: "600", marginTop: 4 },
  paywallSub: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center", lineHeight: 20 },
  price: { color: "#fff", fontSize: 16, fontWeight: "600", marginTop: 6 },
  button: {
    backgroundColor: "#fff",
    borderRadius: 12,
    paddingVertical: 13,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
    marginTop: 8,
    alignSelf: "stretch",
  },
  buttonText: { color: "#0b6f8e", fontWeight: "600", fontSize: 15 },
  proBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
    backgroundColor: "#fff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: 14,
  },
  proBadgeText: { color: "#0b6f8e", fontWeight: "700", fontSize: 12 },
  searchCard: {
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    marginBottom: 10,
  },
  input: { flex: 1, color: "#fff", fontSize: 14 },
  empty: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14, textAlign: "center" },
  tutorCard: {
    borderRadius: 18,
    padding: 16,
    overflow: "hidden",
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  tutorHead: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 12 },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  tutorName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  tutorCourse: { color: "rgba(255,255,255,0.8)", fontSize: 13, marginTop: 2 },

  ratingHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 14,
  },
  starRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  ratingText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  reviewCountText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  viewReviewsBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  viewReviewsText: { color: "#fff", fontSize: 12, fontWeight: "600" },

  expandedSection: {
    backgroundColor: "rgba(0,0,0,0.15)",
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  breakdownTitle: { color: "#fff", fontSize: 12, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 },
  distRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 },
  starLabel: { color: "rgba(255,255,255,0.8)", fontSize: 11, width: 22 },
  distTrack: { flex: 1, height: 6, backgroundColor: "rgba(255,255,255,0.2)", borderRadius: 3, overflow: "hidden" },
  distFill: { height: "100%", backgroundColor: "#ffd166", borderRadius: 3 },
  distCount: { color: "rgba(255,255,255,0.7)", fontSize: 11, width: 20, textAlign: "right" },

  noReviewsText: { color: "rgba(255,255,255,0.6)", fontSize: 12, fontStyle: "italic" },
  reviewCard: {
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    padding: 10,
    marginBottom: 6,
  },
  reviewCardHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  actionBtnsRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  reviewComment: { color: "rgba(255,255,255,0.9)", fontSize: 12 },

  pickLabel: { color: "rgba(255,255,255,0.85)", fontSize: 13, marginBottom: 8 },
  hoursRow: { flexDirection: "row", gap: 8, marginBottom: 14 },
  hourChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  hourChipSel: { backgroundColor: "#fff" },
  hourText: { color: "#fff", fontWeight: "600", fontSize: 13 },
  hourTextSel: { color: "#0b6f8e" },
  bookBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.4)",
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 46,
  },
  bookText: { color: "#fff", fontWeight: "600", fontSize: 15 },
});
