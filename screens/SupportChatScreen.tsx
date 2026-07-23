import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Client } from "@stomp/stompjs";
import SkyBackground from "./SkyBackground";
import { session, groupMessages, WS_URL } from "../api";
import type { ChatMessage, StackProps, User } from "../types";

export default function SupportChatScreen({ route, navigation }: StackProps<"SupportChat">) {
  const insets = useSafeAreaInsets();
  const { recipientId, recipientName, roomKey } = route.params;
  const me = (session.user ?? ({} as User)) as User;
  const isAdmin = me?.userType === "ADMIN";

  // roomKey is pre-computed as support.{userId}.{adminId} — unique per user-admin pair.
  // This ensures each user has their own private chat with each admin.
  const channel = roomKey;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const clientRef = useRef<Client | null>(null);
  const listRef = useRef<FlatList<ChatMessage> | null>(null);

  const addMessage = useCallback((m: ChatMessage) => {
    setMessages((prev) => {
      if (m.messageId && prev.some((x) => x.messageId === m.messageId)) return prev;
      return [...prev, m];
    });
  }, []);

  useEffect(() => {
    let active = true;
    groupMessages(channel)
      .then((d) => {
        if (active) setMessages(Array.isArray(d) ? d : []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });

    const client = new Client({
      brokerURL: WS_URL,
      webSocketFactory: () => new WebSocket(WS_URL),
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/group." + channel, (frame) => {
          try {
            addMessage(JSON.parse(frame.body));
          } catch (e) {
            // ignore
          }
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
      onWebSocketError: () => setConnected(false),
    });

    client.activate();
    clientRef.current = client;

    return () => {
      active = false;
      try {
        client.deactivate();
      } catch (e) {
        // ignore
      }
    };
  }, [channel, addMessage]);

  const send = () => {
    const body = text.trim();
    if (!body || !clientRef.current || !connected) return;
    clientRef.current.publish({
      destination: "/app/group/" + channel,
      body: JSON.stringify({ senderId: me.userId, senderName: me.username, body }),
    });
    setText("");
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId === me.userId;
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
        {!mine && (
          <View style={styles.avatarCircle}>
            <Ionicons name={isAdmin ? "person" : "headset"} size={14} color="#0b6f8e" />
          </View>
        )}
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          {!mine && <Text style={styles.sender}>{item.senderName || item.senderId}</Text>}
          <Text style={[styles.body, mine && { color: "#0b3a4a" }]}>{item.body}</Text>
          {item.sentAt && (
            <Text style={[styles.timestamp, mine && { color: "rgba(11,58,74,0.55)" }]}>
              {new Date(item.sentAt as string).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <SkyBackground>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} activeOpacity={0.85}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.headerAvatar}>
            <Ionicons name={isAdmin ? "person" : "headset"} size={18} color="#0b6f8e" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{recipientName || "Support Agent"}</Text>
            <Text style={styles.status}>
              {connected
                ? isAdmin
                  ? "User Online"
                  : "Support Online"
                : "Connecting..."}
            </Text>
          </View>
          {connected && (
            <View style={styles.onlineDot} />
          )}
        </View>

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m, i) => m.messageId || String(i)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 10, paddingTop: 6 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="chatbubbles-outline" size={40} color="rgba(255,255,255,0.4)" />
                <Text style={styles.empty}>
                  {isAdmin
                    ? "No messages from this user yet."
                    : "Ask us anything! We're happy to help."}
                </Text>
              </View>
            }
          />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              style={styles.input}
              placeholder={isAdmin ? "Reply to user..." : "Type your message..."}
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity
              style={[styles.sendBtn, (!text.trim() || !connected) && { opacity: 0.5 }]}
              onPress={send}
              activeOpacity={0.85}
              disabled={!text.trim() || !connected}
            >
              <Ionicons name="send" size={18} color="#0b6f8e" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  onlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#4ade80",
    marginRight: 4,
  },
  title: { color: "#fff", fontSize: 17, fontWeight: "600" },
  status: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 1 },
  row: { marginVertical: 4, flexDirection: "row", alignItems: "flex-end", gap: 6 },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  bubble: { maxWidth: "78%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  bubbleMine: { backgroundColor: "#fff", borderBottomRightRadius: 4 },
  bubbleOther: {
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderBottomLeftRadius: 4,
  },
  sender: { color: "#9fe6d4", fontSize: 11, fontWeight: "700", marginBottom: 3 },
  body: { color: "#fff", fontSize: 15, lineHeight: 20 },
  timestamp: { color: "rgba(255,255,255,0.5)", fontSize: 10, marginTop: 4, alignSelf: "flex-end" },
  emptyContainer: { alignItems: "center", marginTop: 60, gap: 12 },
  empty: { color: "rgba(255,255,255,0.7)", textAlign: "center", fontSize: 14, paddingHorizontal: 30 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "rgba(0,0,0,0.15)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    maxHeight: 110,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  sendBtn: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});
