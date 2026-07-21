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
  Linking,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Client } from "@stomp/stompjs";
import SkyBackground from "./SkyBackground";
import { session, groupMessages, getBooking, WS_URL, listUsers, userName } from "../api";
import type { ChatMessage, StackProps, User } from "../types";

export default function SessionChatScreen({ route, navigation }: StackProps<"SessionChat">) {
  const insets = useSafeAreaInsets();
  const { bookingId, title } = route.params;
  const channel = "booking." + bookingId;
  const me = (session.user ?? ({} as User)) as User;
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [zoomLink, setZoomLink] = useState<string | null>(null);
  const [peerName, setPeerName] = useState<string | null>(null);
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
    // load history (reuses group messages endpoint with the booking channel as the id)
    groupMessages(channel)
      .then((d) => {
        if (active) setMessages(Array.isArray(d) ? d : []);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    // load the zoom link from the booking
    getBooking(bookingId)
      .then((b) => {
        if (!active || !b) return;
        setZoomLink(b.zoomLink);
        // Resolve the other participant's name (the student, from the tutor's
        // point of view, or the tutor from the student's) so the chat header
        // shows who you're actually talking to.
        const tutorId = b.tutorId as string | undefined;
        const studentId = b.studentId as string | undefined;
        const peerId = me.userId === tutorId ? studentId : tutorId;
        if (peerId) {
          listUsers()
            .then((users) => {
              if (!active) return;
              const map: Record<string, any> = {};
              (Array.isArray(users) ? users : []).forEach((u: any) => {
                if (u && u.userId) map[u.userId] = u;
              });
              setPeerName(userName(map[peerId]) || null);
            })
            .catch(() => {});
        }
      })
      .catch(() => {});

    const client = new Client({
      brokerURL: WS_URL,
      webSocketFactory: () => new WebSocket(WS_URL),
      // RN mangles STOMP NULL terminators; these flags fix send+receive.
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      reconnectDelay: 3000,
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/group." + channel, (frame) => {
          try {
            addMessage(JSON.parse(frame.body));
          } catch (e) {
            // ignore parse errors
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
  }, [bookingId, channel, addMessage]);

  const send = () => {
    const body = text.trim();
    if (!body || !clientRef.current || !connected) return;
    clientRef.current.publish({
      destination: "/app/group/" + channel,
      body: JSON.stringify({ senderId: me.userId, senderName: me.username, body }),
    });
    setText("");
  };

  const openZoom = async () => {
    if (!zoomLink) return;
    try {
      const ok = await Linking.canOpenURL(zoomLink);
      if (ok) Linking.openURL(zoomLink);
      else Alert.alert("Cannot open link", zoomLink);
    } catch (e) {
      Alert.alert("Cannot open link", zoomLink);
    }
  };

  const renderItem = ({ item }: { item: ChatMessage }) => {
    const mine = item.senderId === me.userId;
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
        <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther]}>
          {!mine && <Text style={styles.sender}>{item.senderName || item.senderId}</Text>}
          <Text style={[styles.body, mine && { color: "#0b3a4a" }]}>{item.body}</Text>
        </View>
      </View>
    );
  };

  return (
    <SkyBackground>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{peerName || title || "Session"}</Text>
            <Text style={styles.status}>{connected ? "online" : "connecting..."}</Text>
          </View>
        </View>

        {zoomLink ? (
          <TouchableOpacity style={styles.pinned} onPress={openZoom} activeOpacity={0.85}>
            <Ionicons name="videocam" size={18} color="#0b6f8e" />
            <View style={{ flex: 1 }}>
              <Text style={styles.pinnedLabel}>Zoom meeting</Text>
              <Text style={styles.pinnedLink} numberOfLines={1}>
                {zoomLink}
              </Text>
            </View>
            <Text style={styles.joinText}>Join</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.noPin}>
            <Ionicons name="videocam-outline" size={15} color="rgba(255,255,255,0.7)" />
            <Text style={styles.noPinText}>No Zoom link posted yet</Text>
          </View>
        )}

        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m, i) => m.messageId || String(i)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 10, paddingTop: 6 }}
            onContentSizeChange={() => (listRef.current?.scrollToEnd({ animated: true }))}
            ListEmptyComponent={<Text style={styles.empty}>No messages yet.</Text>}
          />
        )}

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            <TextInput
              style={styles.input}
              placeholder="Message"
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={text}
              onChangeText={setText}
              multiline
            />
            <TouchableOpacity style={styles.sendBtn} onPress={send} activeOpacity={0.85}>
              <Ionicons name="send" size={18} color="#0b6f8e" />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  title: { color: "#fff", fontSize: 18, fontWeight: "600" },
  status: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  pinned: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 14,
    marginBottom: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  pinnedLabel: { color: "#0b6f8e", fontSize: 11, fontWeight: "700" },
  pinnedLink: { color: "#0b3a4a", fontSize: 12, marginTop: 1 },
  joinText: { color: "#0b6f8e", fontWeight: "700", fontSize: 14 },
  noPin: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginHorizontal: 14,
    marginBottom: 8,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  noPinText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  row: { marginVertical: 4, flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleMine: { backgroundColor: "#fff", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderBottomLeftRadius: 4 },
  sender: { color: "#9fe6d4", fontSize: 11, fontWeight: "700", marginBottom: 3 },
  body: { color: "#fff", fontSize: 15 },
  empty: { color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 30 },
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: "rgba(0,0,0,0.15)",
  },
  input: {
    flex: 1,
    color: "#fff",
    fontSize: 15,
    maxHeight: 110,
    backgroundColor: "rgba(255,255,255,0.16)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
});
