import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import SkyBackground from "./SkyBackground";
import { getSupportAccounts, getSupportConversations, session, userName } from "../api";
import type { StackProps, User } from "../types";

interface SupportConversation {
  roomKey: string;
  userId: string;
  displayName: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
}

export default function SupportListScreen({ navigation }: StackProps<"SupportList">) {
  const insets = useSafeAreaInsets();
  const me = session.user as User;
  const isAdmin = me?.userType === "ADMIN";

  const [supportAccounts, setSupportAccounts] = useState<User[]>([]);
  const [conversations, setConversations] = useState<SupportConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    try {
      if (isAdmin) {
        // Admins see the list of users who have messaged them
        const data = await getSupportConversations(me.userId);
        setConversations(Array.isArray(data) ? data : []);
      } else {
        // Regular users see list of support admins they can chat with
        const data = await getSupportAccounts();
        setSupportAccounts(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      Alert.alert("Support Notice", "Could not load support data. " + (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [isAdmin, me?.userId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>{isAdmin ? "Support Inbox" : "CoStudy Support"}</Text>
        </View>

        <BlurView intensity={26} tint="light" style={styles.bannerCard}>
          <Ionicons name={isAdmin ? "people-outline" : "headset-outline"} size={28} color="#fff" />
          <Text style={styles.bannerTitle}>
            {isAdmin ? "User Conversations" : "We are here to help!"}
          </Text>
          <Text style={styles.bannerSub}>
            {isAdmin
              ? "Conversations from users who have messaged you for support."
              : "Select a support administrator below to start a 1-on-1 chat."}
          </Text>
        </BlurView>

        <Text style={styles.sectionLabel}>
          {isAdmin ? "Active Conversations" : "Available Support Agents"}
        </Text>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 24 }} />
        ) : isAdmin ? (
          // ADMIN VIEW: list of users who sent them messages
          conversations.length === 0 ? (
            <BlurView intensity={20} tint="light" style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={28} color="rgba(255,255,255,0.8)" />
              <Text style={styles.emptyText}>No user conversations yet.</Text>
              <Text style={styles.emptySubText}>
                When users send you support messages, they will appear here.
              </Text>
            </BlurView>
          ) : (
            conversations.map((conv) => {
              const displayName = conv.displayName || conv.userId || "User";
              const preview = conv.lastMessage || "No messages yet";
              return (
                <TouchableOpacity
                  key={conv.roomKey}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("SupportChat", {
                      recipientId: conv.userId,
                      recipientName: displayName,
                      roomKey: conv.roomKey,
                    })
                  }
                >
                  <BlurView intensity={28} tint="light" style={styles.accountCard}>
                    <View style={styles.avatar}>
                      <Ionicons name="person" size={20} color="#0b6f8e" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.accountName}>{displayName}</Text>
                      <Text style={styles.previewText} numberOfLines={1}>{preview}</Text>
                    </View>
                    <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                  </BlurView>
                </TouchableOpacity>
              );
            })
          )
        ) : (
          // REGULAR USER VIEW: list of available support admins
          supportAccounts.length === 0 ? (
            <BlurView intensity={20} tint="light" style={styles.empty}>
              <Ionicons name="chatbubbles-outline" size={28} color="rgba(255,255,255,0.8)" />
              <Text style={styles.emptyText}>No support accounts currently active.</Text>
            </BlurView>
          ) : (
            supportAccounts.map((account) => {
              const displayName = userName(account) || account.username || "Support Admin";
              // Unique room key: support.{myUserId}.{adminId}
              const roomKey = `support.${me.userId}.${account.userId}`;
              return (
                <TouchableOpacity
                  key={account.userId}
                  activeOpacity={0.85}
                  onPress={() =>
                    navigation.navigate("SupportChat", {
                      recipientId: account.userId,
                      recipientName: displayName,
                      roomKey,
                    })
                  }
                >
                  <BlurView intensity={28} tint="light" style={styles.accountCard}>
                    <View style={styles.avatar}>
                      <Ionicons name="headset" size={20} color="#0b6f8e" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.accountName}>{displayName}</Text>
                      <Text style={styles.accountRole}>Official CoStudy Administrator</Text>
                    </View>
                    <Ionicons name="chatbubble-ellipses" size={20} color="#fff" />
                  </BlurView>
                </TouchableOpacity>
              );
            })
          )
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  bannerCard: {
    borderRadius: 18,
    padding: 20,
    alignItems: "center",
    gap: 8,
    overflow: "hidden",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
  },
  bannerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  bannerSub: { color: "rgba(255,255,255,0.85)", fontSize: 13, textAlign: "center", lineHeight: 18 },
  sectionLabel: { color: "rgba(255,255,255,0.9)", fontSize: 15, fontWeight: "600", marginBottom: 12 },
  empty: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" },
  emptySubText: { color: "rgba(255,255,255,0.65)", fontSize: 12, textAlign: "center" },
  accountCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.22)",
  },
  avatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  accountName: { color: "#fff", fontSize: 16, fontWeight: "600" },
  accountRole: { color: "rgba(255,255,255,0.8)", fontSize: 12, marginTop: 2 },
  previewText: { color: "rgba(255,255,255,0.65)", fontSize: 12, marginTop: 2 },
});
