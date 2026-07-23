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
import { getNotifications, markNotificationRead, markAllNotificationsRead } from "../api";
import type { AppNotification, StackProps } from "../types";

function iconFor(type?: string): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "PAYMENT_SUCCESS":
      return "checkmark-circle";
    case "PAYMENT_FAILED":
      return "close-circle";
    case "BOOKING_NEW":
    case "BOOKING_CONFIRMED":
      return "calendar";
    case "BOOKING_CANCELLED":
      return "calendar-outline";
    case "SESSION_STARTED":
      return "play-circle";
    case "SESSION_COMPLETED":
      return "checkmark-done-circle";
    case "APPLICATION_APPROVED":
      return "trophy";
    case "APPLICATION_DECLINED":
      return "sad-outline";
    case "PRO_ACTIVATED":
      return "star";
    case "CHAT":
      return "chatbubble";
    default:
      return "notifications";
  }
}

function iconColor(type?: string, isRead?: boolean): string {
  if (isRead) return "rgba(255,255,255,0.7)";
  switch (type) {
    case "PAYMENT_SUCCESS":
    case "SESSION_STARTED":
    case "SESSION_COMPLETED":
      return "#2ecc71";
    case "PAYMENT_FAILED":
    case "APPLICATION_DECLINED":
      return "#e74c3c";
    case "APPLICATION_APPROVED":
    case "PRO_ACTIVATED":
      return "#f1c40f";
    case "BOOKING_CANCELLED":
      return "#e67e22";
    default:
      return "#9fe6d4";
  }
}

export default function NotificationsScreen({ navigation }: StackProps<"Notifications">) {
  const insets = useSafeAreaInsets();
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await getNotifications();
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      Alert.alert("Could not load notifications", (e as Error).message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const handleMarkAllRead = async () => {
    setMarkingAll(true);
    try {
      await markAllNotificationsRead();
      setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    } catch (e) {
      Alert.alert("Notice", (e as Error).message);
    } finally {
      setMarkingAll(false);
    }
  };

  const open = async (n: AppNotification) => {
    if (!n.read) {
      try {
        await markNotificationRead(n.notificationId);
        setItems((prev) => prev.map((x) => (x.notificationId === n.notificationId ? { ...x, read: true } : x)));
      } catch (e) {
        // ignore
      }
    }
  };

  const unread = items.filter((i) => !i.read).length;

  return (
    <SkyBackground>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + 16, paddingHorizontal: 20, paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#fff" />}
      >
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.title}>Notifications</Text>
          {unread > 0 && <View style={styles.badge}><Text style={styles.badgeText}>{unread}</Text></View>}

          <View style={{ flex: 1 }} />
          {unread > 0 && (
            <TouchableOpacity onPress={handleMarkAllRead} disabled={markingAll} style={styles.readAllBtn}>
              {markingAll ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.readAllText}>Mark all read</Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 30 }} />
        ) : items.length === 0 ? (
          <BlurView intensity={20} tint="light" style={styles.empty}>
            <Ionicons name="notifications-off-outline" size={28} color="rgba(255,255,255,0.85)" />
            <Text style={styles.emptyText}>You're all caught up.</Text>
          </BlurView>
        ) : (
          items.map((n) => (
            <TouchableOpacity key={n.notificationId} onPress={() => open(n)} activeOpacity={0.85}>
              <BlurView
                intensity={n.read ? 18 : 30}
                tint="light"
                style={[styles.card, !n.read && styles.cardUnread]}
              >
                <Ionicons name={iconFor(n.type)} size={22} color={iconColor(n.type, n.read)} />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.msg, !n.read && styles.msgUnread]}>{n.message}</Text>
                  {!n.read && <Text style={styles.newTag}>New</Text>}
                </View>
              </BlurView>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  title: { color: "#fff", fontSize: 22, fontWeight: "600" },
  badge: {
    backgroundColor: "#1f9d6b",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgeText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  readAllBtn: {
    backgroundColor: "rgba(255,255,255,0.18)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  readAllText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  empty: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    gap: 10,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  emptyText: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    padding: 14,
    marginBottom: 12,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  cardUnread: { borderColor: "rgba(159,230,212,0.6)" },
  msg: { color: "rgba(255,255,255,0.85)", fontSize: 14 },
  msgUnread: { color: "#fff", fontWeight: "600" },
  newTag: { color: "#9fe6d4", fontSize: 11, fontWeight: "700", marginTop: 4 },
});
