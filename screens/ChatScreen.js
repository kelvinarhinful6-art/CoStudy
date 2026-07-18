import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, Image } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Client } from "@stomp/stompjs";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { WebView } from "react-native-webview";
import SkyBackground from "./SkyBackground";
import { session, groupMessages, WS_URL, getGroupMembers, renameGroup, kickMember, listUsers, uploadChatFile, deleteChatMessage } from "../api";

const FILE_HOST = WS_URL.replace("ws://", "http://").replace("/ws", "");

function isImageType(fileType) {
  return typeof fileType === "string" && fileType.startsWith("image/");
}

export default function ChatScreen({ route, navigation }) {
  const insets = useSafeAreaInsets();
  const { groupId, groupName: initialGroupName } = route.params || {};
  const me = session.user || {};
  const [groupName, setGroupName] = useState(initialGroupName || "Group chat");
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState(false);
  const [uploading, setUploading] = useState(false);
  const clientRef = useRef(null);
  const listRef = useRef(null);

  const [membersVisible, setMembersVisible] = useState(false);
  const [members, setMembers] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [membersLoading, setMembersLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [kickingId, setKickingId] = useState(null);
  const [onlineIds, setOnlineIds] = useState([]);

  const [imageViewerUrl, setImageViewerUrl] = useState(null);
  const [fileViewerUrl, setFileViewerUrl] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const myIsAdmin = members.some((m) => m.userId === me.userId && m.isAdmin);

  const addMessage = useCallback((m) => {
    setMessages((prev) => {
      if (m.messageId && prev.some((x) => x.messageId === m.messageId)) return prev;
      return [...prev, m];
    });
  }, []);

  const removeMessage = useCallback((messageId) => {
    setMessages((prev) => prev.filter((m) => m.messageId !== messageId));
  }, []);

  useEffect(() => {
    let active = true;
    groupMessages(groupId)
      .then((data) => { if (active) setMessages(Array.isArray(data) ? data : []); })
      .catch(() => {})
      .finally(() => { if (active) setLoading(false); });
    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/group." + groupId, (frame) => {
          try { addMessage(JSON.parse(frame.body)); } catch (e) {}
        });
        client.subscribe("/topic/group." + groupId + ".delete", (frame) => {
          removeMessage(frame.body);
        });
        client.subscribe("/topic/group." + groupId + ".presence", (frame) => {
          try { setOnlineIds(JSON.parse(frame.body)); } catch (e) {}
        });
        client.publish({
          destination: "/app/group/" + groupId + "/presence",
          body: JSON.stringify({ userId: me.userId, online: true }),
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
        client.publish({
          destination: "/app/group/" + groupId + "/presence",
          body: JSON.stringify({ userId: me.userId, online: false }),
        });
      } catch (e) {}
      try { client.deactivate(); } catch (e) {}
    };
  }, [groupId, addMessage, removeMessage]);

  const publish = (body, fileUrl, fileName, fileType) => {
    if (!clientRef.current || !connected) return;
    clientRef.current.publish({
      destination: "/app/group/" + groupId,
      body: JSON.stringify({
        senderId: me.userId,
        senderName: me.username,
        body: body || null,
        fileUrl: fileUrl || null,
        fileName: fileName || null,
        fileType: fileType || null,
      }),
    });
  };

  const send = () => {
    const body = text.trim();
    if (!body || !connected) return;
    publish(body, null, null, null);
    setText("");
  };

  const attachFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const uploaded = await uploadChatFile(groupId, asset);
      publish(null, uploaded.fileUrl, uploaded.fileName, uploaded.fileType);
    } catch (e) {
      Alert.alert("Could not attach file", e.message);
    } finally {
      setUploading(false);
    }
  };

  const takePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera permission needed", "Enable camera access in your device settings to take photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({ quality: 0.7 });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      const asset = result.assets[0];
      setUploading(true);
      const uploaded = await uploadChatFile(groupId, {
        uri: asset.uri,
        name: asset.fileName || `photo-${Date.now()}.jpg`,
        mimeType: asset.mimeType || "image/jpeg",
      });
      publish(null, uploaded.fileUrl, uploaded.fileName, uploaded.fileType);
    } catch (e) {
      Alert.alert("Could not take photo", e.message);
    } finally {
      setUploading(false);
    }
  };

  const openMembers = async () => {
    setMembersVisible(true);
    setMembersLoading(true);
    try {
      const [mem, allUsers] = await Promise.all([getGroupMembers(groupId), listUsers()]);
      setMembers(Array.isArray(mem) ? mem : []);
      const map = {};
      (Array.isArray(allUsers) ? allUsers : []).forEach((u) => { map[u.userId] = u; });
      setUsersById(map);
      setNewName(groupName);
    } catch (e) {
      Alert.alert("Could not load members", e.message);
    } finally {
      setMembersLoading(false);
    }
  };

  const saveRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === groupName) return;
    setSavingName(true);
    try {
      const updated = await renameGroup(groupId, trimmed);
      setGroupName(updated.groupName);
      Alert.alert("Renamed", "Group name updated.");
    } catch (e) {
      Alert.alert("Could not rename", e.message);
    } finally {
      setSavingName(false);
    }
  };

  const doKick = (member) => {
    const displayName = usersById[member.userId]?.username || member.userId;
    Alert.alert("Remove member?", `Remove ${displayName} from this group?`, [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        setKickingId(member.userId);
        try {
          await kickMember(groupId, member.userId);
          setMembers((prev) => prev.filter((m) => m.userId !== member.userId));
        } catch (e) {
          Alert.alert("Could not remove member", e.message);
        } finally {
          setKickingId(null);
        }
      }},
    ]);
  };

  const openAttachment = (item) => {
    if (isImageType(item.fileType)) {
      setImageViewerUrl(FILE_HOST + item.fileUrl);
    } else {
      setFileViewerUrl(FILE_HOST + item.fileUrl);
    }
  };

  const doDeleteMessage = (item) => {
    Alert.alert("Delete message?", "This will remove it for everyone in the group.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        setDeletingId(item.messageId);
        try {
          await deleteChatMessage(groupId, item.messageId);
          removeMessage(item.messageId);
        } catch (e) {
          Alert.alert("Could not delete message", e.message);
        } finally {
          setDeletingId(null);
        }
      }},
    ]);
  };

  const renderItem = ({ item }) => {
    if (item.senderId === "system") {
      return (
        <View style={styles.systemRow}>
          <Text style={styles.systemText}>{item.body}</Text>
        </View>
      );
    }
    const mine = item.senderId === me.userId;
    const hasFile = !!item.fileUrl;
    const isImage = hasFile && isImageType(item.fileType);
    return (
      <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
        <TouchableOpacity
          activeOpacity={mine ? 0.7 : 1}
          onLongPress={mine ? () => doDeleteMessage(item) : undefined}
          delayLongPress={350}
        >
          <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, isImage && styles.bubbleImage]}>
            {!mine && <Text style={styles.sender}>{item.senderName || item.senderId}</Text>}
            {isImage && (
              <TouchableOpacity onPress={() => openAttachment(item)} activeOpacity={0.9}>
                <Image source={{ uri: FILE_HOST + item.fileUrl }} style={styles.imageAttachment} resizeMode="cover" />
              </TouchableOpacity>
            )}
            {hasFile && !isImage && (
              <TouchableOpacity style={styles.fileChip} onPress={() => openAttachment(item)} activeOpacity={0.85}>
                <Ionicons name="document-attach-outline" size={18} color={mine ? "#0b6f8e" : "#fff"} />
                <Text style={[styles.fileChipText, mine && { color: "#0b6f8e" }]} numberOfLines={1}>{item.fileName || "File"}</Text>
              </TouchableOpacity>
            )}
            {!!item.body && <Text style={[styles.body, mine && { color: "#0b3a4a" }, hasFile && { marginTop: 6 }]}>{item.body}</Text>}
            {mine && deletingId === item.messageId && <ActivityIndicator size="small" color="#0b6f8e" style={{ marginTop: 4 }} />}
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SkyBackground>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color="#fff" /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{groupName}</Text>
            <Text style={styles.status}>{connected ? `online · ${onlineIds.length} here now` : "connecting..."}</Text>
          </View>
          <TouchableOpacity onPress={openMembers} style={styles.membersBtn}>
            <Ionicons name="people" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
        {loading ? (
          <ActivityIndicator color="#fff" style={{ marginTop: 30 }} />
        ) : (
          <FlatList
            ref={listRef}
            data={messages}
            keyExtractor={(m, i) => m.messageId || String(i)}
            renderItem={renderItem}
            contentContainerStyle={{ paddingHorizontal: 14, paddingBottom: 10, paddingTop: 6 }}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hello!</Text>}
          />
        )}
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            <TouchableOpacity style={styles.iconBtn} onPress={attachFile} disabled={uploading} activeOpacity={0.85}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Ionicons name="attach" size={22} color="#fff" />}
            </TouchableOpacity>
            <TouchableOpacity style={styles.iconBtn} onPress={takePhoto} disabled={uploading} activeOpacity={0.85}>
              <Ionicons name="camera" size={21} color="#fff" />
            </TouchableOpacity>
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

      <Modal visible={!!imageViewerUrl} transparent animationType="fade" onRequestClose={() => setImageViewerUrl(null)}>
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={() => setImageViewerUrl(null)}>
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>
          {imageViewerUrl && (
            <Image source={{ uri: imageViewerUrl }} style={styles.fullscreenImage} resizeMode="contain" />
          )}
        </View>
      </Modal>

      <Modal visible={!!fileViewerUrl} animationType="slide" onRequestClose={() => setFileViewerUrl(null)}>
        <View style={{ flex: 1, backgroundColor: "#0b3a4a", paddingTop: insets.top }}>
          <View style={styles.fileViewerHeader}>
            <TouchableOpacity onPress={() => setFileViewerUrl(null)}>
              <Ionicons name="close" size={26} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.fileViewerTitle}>Viewing file</Text>
          </View>
          {fileViewerUrl && (
            <WebView source={{ uri: fileViewerUrl }} style={{ flex: 1 }} startInLoadingState renderLoading={() => <ActivityIndicator color="#fff" style={{ marginTop: 30 }} />} />
          )}
        </View>
      </Modal>

      <Modal visible={membersVisible} transparent animationType="slide" onRequestClose={() => setMembersVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Group members</Text>
              <TouchableOpacity onPress={() => setMembersVisible(false)}>
                <Ionicons name="close" size={24} color="#fff" />
              </TouchableOpacity>
            </View>

            {myIsAdmin && (
              <View style={styles.renameRow}>
                <TextInput
                  style={styles.renameInput}
                  value={newName}
                  onChangeText={setNewName}
                  placeholder="Group name"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                />
                <TouchableOpacity style={styles.renameSaveBtn} onPress={saveRename} disabled={savingName}>
                  {savingName ? <ActivityIndicator color="#0b6f8e" /> : <Text style={styles.renameSaveText}>Save</Text>}
                </TouchableOpacity>
              </View>
            )}

            {membersLoading ? (
              <ActivityIndicator color="#fff" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={members}
                keyExtractor={(m) => m.userId}
                style={{ marginTop: 10 }}
                renderItem={({ item }) => {
                  const displayName = usersById[item.userId]?.username || item.userId;
                  const isOnline = onlineIds.includes(item.userId);
                  return (
                    <View style={styles.memberRow}>
                      <View>
                        <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{displayName.charAt(0).toUpperCase()}</Text></View>
                        {isOnline && <View style={styles.onlineDot} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{displayName}</Text>
                        {item.isAdmin && <Text style={styles.adminTag}>Admin</Text>}
                        {!item.isAdmin && <Text style={styles.onlineStatusText}>{isOnline ? "Online" : "Offline"}</Text>}
                      </View>
                      {myIsAdmin && !item.isAdmin && (
                        <TouchableOpacity onPress={() => doKick(item)} disabled={kickingId === item.userId}>
                          {kickingId === item.userId ? <ActivityIndicator color="#ffb4b4" /> : <Ionicons name="close-circle-outline" size={22} color="#ffb4b4" />}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                }}
                ListEmptyComponent={<Text style={styles.empty}>No members found.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
    </SkyBackground>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, marginBottom: 8 },
  title: { color: "#fff", fontSize: 18, fontWeight: "600" },
  status: { color: "rgba(255,255,255,0.75)", fontSize: 12 },
  membersBtn: { padding: 6 },
  row: { marginVertical: 4, flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  systemRow: { alignItems: "center", marginVertical: 8 },
  systemText: { color: "rgba(255,255,255,0.65)", fontSize: 12, fontStyle: "italic", textAlign: "center" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleImage: { padding: 6 },
  bubbleMine: { backgroundColor: "#fff", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderBottomLeftRadius: 4 },
  sender: { color: "#9fe6d4", fontSize: 11, fontWeight: "700", marginBottom: 3 },
  body: { color: "#fff", fontSize: 15 },
  empty: { color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 30 },
  imageAttachment: { width: 200, height: 200, borderRadius: 12 },
  fileChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, maxWidth: 220 },
  fileChipText: { color: "#fff", fontSize: 13, flexShrink: 1 },
  inputBar: { flexDirection: "row", alignItems: "flex-end", gap: 6, paddingHorizontal: 12, paddingTop: 8, backgroundColor: "rgba(0,0,0,0.15)" },
  iconBtn: { width: 38, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, color: "#fff", fontSize: 15, maxHeight: 110, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  imageViewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.92)", alignItems: "center", justifyContent: "center" },
  imageViewerClose: { position: "absolute", top: 50, right: 20, zIndex: 10, padding: 8 },
  fullscreenImage: { width: "100%", height: "80%" },
  fileViewerHeader: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingBottom: 10 },
  fileViewerTitle: { color: "#fff", fontSize: 16, fontWeight: "600" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#0b3a4a", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "75%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  renameRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  renameInput: { flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: "#fff", fontSize: 14 },
  renameSaveBtn: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  renameSaveText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.12)" },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  memberAvatarText: { color: "#0b6f8e", fontSize: 16, fontWeight: "700" },
  onlineDot: { position: "absolute", bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: "#3ddc84", borderWidth: 2, borderColor: "#0b3a4a" },
  memberName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  adminTag: { color: "#9fe6d4", fontSize: 11, fontWeight: "700", marginTop: 2 },
  onlineStatusText: { color: "rgba(255,255,255,0.6)", fontSize: 11, marginTop: 2 },
});