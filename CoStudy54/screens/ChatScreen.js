import React, { useState, useEffect, useRef, useCallback } from "react";
import { View, Text, StyleSheet, TextInput, TouchableOpacity, FlatList, KeyboardAvoidingView, Platform, ActivityIndicator, Modal, Alert, Image, Linking, ScrollView, Animated, PanResponder, Keyboard } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Client } from "@stomp/stompjs";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { WebView } from "react-native-webview";
import SkyBackground from "./SkyBackground";
import { session, groupMessages, WS_URL, getGroupMembers, renameGroup, kickMember, listUsers, uploadChatFile, editChatMessage, deleteChatMessage, clearChat, leaveGroup, deleteGroup } from "../api";

const FILE_HOST = WS_URL.replace("ws://", "http://").replace("/ws", "");

function isImageType(fileType) { return typeof fileType === "string" && fileType.startsWith("image/"); }

const SwipeToReplyRow = ({ children, onSwipe }) => {
  const pan = useRef(new Animated.Value(0)).current;
  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (e, g) => Math.abs(g.dx) > 10 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
      onPanResponderMove: (e, g) => { if (g.dx > 0) pan.setValue(g.dx * 0.5); },
      onPanResponderRelease: (e, g) => {
        if (g.dx > 25) onSwipe(); // Reduced swipe distance from 50 to 25
        Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start();
      },
      onPanResponderTerminate: () => { Animated.spring(pan, { toValue: 0, useNativeDriver: false }).start(); }
    })
  ).current;
  return (
    <Animated.View {...panResponder.panHandlers} style={{ transform: [{ translateX: pan }] }}>
      {children}
    </Animated.View>
  );
};

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
  const [viewingImage, setViewingImage] = useState(null);
  const [viewingFile, setViewingFile] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);
  const [pendingImages, setPendingImages] = useState([]);

  const clientRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const [membersVisible, setMembersVisible] = useState(false);
  const [members, setMembers] = useState([]);
  const [usersById, setUsersById] = useState({});
  const [membersLoading, setMembersLoading] = useState(false);
  const [newName, setNewName] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [kickingId, setKickingId] = useState(null);

  const myIsAdmin = members.some((m) => m.userId === me.userId && m.isAdmin);

  const addMessage = useCallback((m) => {
    setMessages((prev) => {
      if (m.clearAll) return [];
      if (m.deleted) return prev.filter(x => x.messageId !== m.messageId);
      if (m.messageId && prev.some((x) => x.messageId === m.messageId)) {
        return prev.map(x => x.messageId === m.messageId ? m : x);
      }
      return [...prev, m];
    });
  }, []);

  useEffect(() => {
    let active = true;
    groupMessages(groupId)
      .then((data) => { if (active) setMessages(Array.isArray(data) ? data : []); })
      .catch(() => {}).finally(() => { if (active) setLoading(false); });
    const client = new Client({
      brokerURL: WS_URL,
      reconnectDelay: 3000,
      forceBinaryWSFrames: true,
      appendMissingNULLonIncoming: true,
      onConnect: () => {
        setConnected(true);
        client.subscribe("/topic/group." + groupId, (frame) => {
          try { 
            const parsed = JSON.parse(frame.body);
            if (parsed.systemText === "Group deleted by admin") {
                Alert.alert("Group Deleted", "This group has been deleted by the admin.");
                if (navigation.canGoBack()) navigation.goBack();
                return;
            }
            addMessage(parsed); 
          } catch (e) {}
        });
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
      onWebSocketError: () => setConnected(false),
    });
    client.activate();
    clientRef.current = client;
    return () => { active = false; try { client.deactivate(); } catch (e) {} };
  }, [groupId, addMessage]);

  const publish = (body, fileUrl, fileName, fileType) => {
    if (!clientRef.current || !connected) return;
    clientRef.current.publish({
      destination: "/app/group/" + groupId,
      body: JSON.stringify({
        senderId: me.userId, senderName: me.username,
        body: body || null, fileUrl: fileUrl || null, fileName: fileName || null, fileType: fileType || null,
        replyToId: replyTo ? replyTo.messageId : null,
        replyToName: replyTo ? replyTo.senderName : null,
        replyToBody: replyTo ? (replyTo.body || (replyTo.fileName ? "File" : "Media")) : null
      }),
    });
  };

  const send = async () => {
    const body = text.trim();
    if (pendingImages.length > 0) {
      setUploading(true);
      for (const img of pendingImages) {
        try {
          const uploaded = await uploadChatFile(groupId, img);
          publish(null, uploaded.fileUrl, uploaded.fileName, uploaded.fileType);
        } catch (e) { Alert.alert("Could not upload image", e.message); }
      }
      setUploading(false);
      setPendingImages([]);
    }
    if (!body || !connected) { setReplyTo(null); return; }
    if (editingId) {
      editChatMessage(groupId, editingId, body).catch(e => Alert.alert("Could not edit", e.message));
      setEditingId(null);
    } else {
      publish(body, null, null, null);
    }
    setText("");
    setReplyTo(null);
  };

  const uploadAsset = async (asset) => {
    setUploading(true);
    try {
      const uploaded = await uploadChatFile(groupId, asset);
      publish(null, uploaded.fileUrl, uploaded.fileName, uploaded.fileType);
      setReplyTo(null);
    } catch (e) { Alert.alert("Could not upload", e.message); } finally { setUploading(false); }
  };

  const showAttachMenu = () => {
    Alert.alert("Attach Media", "Choose an option", [
      { text: "Take Photo", onPress: takePhoto },
      { text: "Choose from Gallery", onPress: pickImage },
      { text: "Choose File", onPress: pickFile },
      { text: "Cancel", style: "cancel" }
    ]);
  };

  const takePhoto = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      setPendingImages(prev => [...prev, { uri: result.assets[0].uri, name: "photo-" + Date.now() + ".jpg", mimeType: "image/jpeg" }]);
    } catch (e) { Alert.alert("Could not open camera", e.message); }
  };

  const pickImage = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsMultipleSelection: true, selectionLimit: 0, quality: 0.8 });
      if (result.canceled || !result.assets || result.assets.length === 0) return;
      const mapped = result.assets.map(a => ({ uri: a.uri, name: "photo-" + Date.now() + ".jpg", mimeType: "image/jpeg" }));
      setPendingImages(prev => [...prev, ...mapped]);
    } catch (e) { Alert.alert("Could not open gallery", e.message); }
  };

  const pickFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true });
      if (result.canceled || !result.assets || !result.assets[0]) return;
      uploadAsset(result.assets[0]);
    } catch (e) { Alert.alert("Could not attach file", e.message); }
  };

  const openMembers = async () => {
    setMembersVisible(true); setMembersLoading(true);
    try {
      const [mem, allUsers] = await Promise.all([getGroupMembers(groupId), listUsers()]);
      setMembers(Array.isArray(mem) ? mem : []);
      const map = {};
      (Array.isArray(allUsers) ? allUsers : []).forEach((u) => { map[u.userId] = u; });
      setUsersById(map); setNewName(groupName);
    } catch (e) { Alert.alert("Could not load members", e.message); } finally { setMembersLoading(false); }
  };

  const saveRename = async () => {
    const trimmed = newName.trim();
    if (!trimmed || trimmed === groupName) return;
    setSavingName(true);
    try { const updated = await renameGroup(groupId, trimmed); setGroupName(updated.groupName); }
    catch (e) { Alert.alert("Could not rename", e.message); } finally { setSavingName(false); }
  };

  const doKick = (member) => {
    const displayName = usersById[member.userId] ? usersById[member.userId].username : member.userId;
    Alert.alert("Remove member?", "Remove " + displayName + " from this group?", [
      { text: "Cancel", style: "cancel" },
      { text: "Remove", style: "destructive", onPress: async () => {
        setKickingId(member.userId);
        try { await kickMember(groupId, member.userId, displayName); setMembers((prev) => prev.filter((m) => m.userId !== member.userId)); }
        catch (e) { Alert.alert("Could not remove member", e.message); } finally { setKickingId(null); }
      }},
    ]);
  };

  const doLeaveGroup = () => {
    Alert.alert("Leave Group?", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      { text: "Leave", style: "destructive", onPress: async () => {
        try { await leaveGroup(groupId); setMembersVisible(false); if (navigation.canGoBack()) navigation.goBack(); }
        catch (e) { Alert.alert("Could not leave group", e.message); }
      }}
    ]);
  };

  const doDeleteGroup = () => {
    Alert.alert("Delete Group?", "This will delete the group and all messages for everyone. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Delete", style: "destructive", onPress: async () => {
        try { await deleteGroup(groupId); setMembersVisible(false); if (navigation.canGoBack()) navigation.goBack(); }
        catch (e) { Alert.alert("Could not delete group", e.message); }
      }}
    ]);
  };

  const doClearChat = () => {
    Alert.alert("Clear Chat?", "This will delete all messages for everyone. This cannot be undone.", [
      { text: "Cancel", style: "cancel" },
      { text: "Clear", style: "destructive", onPress: async () => {
        try { await clearChat(groupId); setMembersVisible(false); Keyboard.dismiss(); } catch (e) { Alert.alert("Could not clear chat", e.message); }
      }}
    ]);
  };

  const openFile = (item) => {
    const isImg = isImageType(item.fileType);
    if (isImg) setViewingImage(FILE_HOST + item.fileUrl);
    else setViewingFile(FILE_HOST + item.fileUrl);
  };

  const triggerReply = (item) => {
    setReplyTo(item); setEditingId(null); setText("");
    inputRef.current ? inputRef.current.focus() : null;
  };

  const onMessageLongPress = (item) => {
    if (item.isSystem) return;
    const buttons = [];
    
    // Only show Reply for messages from OTHER people
    if (item.senderId !== me.userId) {
      buttons.push({ text: "Reply", onPress: () => triggerReply(item) });
    } else {
      // Show Edit/Delete only for your own messages
      if (item.body) buttons.push({ text: "Edit", onPress: () => { setEditingId(item.messageId); setText(item.body || ""); setReplyTo(null); inputRef.current ? inputRef.current.focus() : null; } });
      buttons.push({ text: "Delete", style: "destructive", onPress: () => { deleteChatMessage(groupId, item.messageId).catch(e => Alert.alert("Could not delete", e.message)); } });
    }
    
    buttons.push({ text: "Cancel", style: "cancel" });
    Alert.alert("Message Options", "Choose an action", buttons);
  };

  const renderItem = ({ item }) => {
    if (item.isSystem) {
      return (
        <View style={styles.systemRow}>
          <View style={styles.systemBubble}>
            <Text style={styles.systemText}>{item.systemText}</Text>
          </View>
        </View>
      );
    }

    const mine = item.senderId === me.userId;
    const hasFile = !!item.fileUrl;
    const isImage = hasFile && isImageType(item.fileType);
    const isDoc = hasFile && !isImage;

    return (
      <SwipeToReplyRow onSwipe={() => triggerReply(item)}>
        <View style={[styles.row, mine ? styles.rowMine : styles.rowOther]}>
          <TouchableOpacity 
            onLongPress={() => onMessageLongPress(item)} 
            delayLongPress={150} 
            activeOpacity={0.9}
            style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleOther, isImage && styles.bubbleMedia]}
          >
            {!mine && <Text style={styles.sender}>{item.senderName || item.senderId}</Text>}
            {item.replyToId && (
              <View style={[styles.replyBox, mine ? styles.replyBoxMine : styles.replyBoxOther]}>
                <Text style={[styles.replyName, mine ? styles.replyNameMine : styles.replyNameOther]}>{item.replyToName}</Text>
                <Text style={[styles.replyText, mine ? styles.replyTextMine : styles.replyTextOther]} numberOfLines={1}>{item.replyToBody}</Text>
              </View>
            )}
            {isImage && (
              <TouchableOpacity onPress={() => openFile(item)} onLongPress={() => onMessageLongPress(item)} delayLongPress={150} activeOpacity={0.9}>
                <Image source={{ uri: FILE_HOST + item.fileUrl }} style={styles.imageAttachment} resizeMode="cover" />
              </TouchableOpacity>
            )}
            {isDoc && (
              <View style={styles.fileChip}>
                <Ionicons name="document-attach-outline" size={18} color={mine ? "#0b6f8e" : "#fff"} />
                <Text style={[styles.fileChipText, mine && { color: "#0b6f8e" }]} numberOfLines={1}>{item.fileName || "File"}</Text>
              </View>
            )}
            {!!item.body && <Text style={mine ? styles.bodyMine : styles.bodyOther}>{item.body}</Text>}
          </TouchableOpacity>
        </View>
      </SwipeToReplyRow>
    );
  };

  return (
    <SkyBackground>
      <View style={{ flex: 1, paddingTop: insets.top + 8 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={26} color="#fff" /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>{groupName}</Text>
            <Text style={styles.status}>{connected ? "online" : "connecting..."}</Text>
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
            onContentSizeChange={() => listRef.current ? listRef.current.scrollToEnd({ animated: true }) : null}
            ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hello!</Text>}
          />
        )}
        
        {pendingImages.length > 0 && (
          <View style={styles.pendingTray}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              {pendingImages.map((img, index) => (
                <View key={index} style={styles.pendingImageWrap}>
                  <Image source={{ uri: img.uri }} style={styles.pendingImage} />
                  <TouchableOpacity style={styles.removePendingBtn} onPress={() => setPendingImages(prev => prev.filter((_, i) => i !== index))}>
                    <Ionicons name="close-circle" size={22} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} keyboardVerticalOffset={8}>
          <View style={[styles.inputBar, { paddingBottom: insets.bottom + 8 }]}>
            {(editingId || replyTo) && (
              <TouchableOpacity style={styles.iconBtn} onPress={() => { setEditingId(null); setText(""); setReplyTo(null); }}>
                <Ionicons name="close-circle" size={24} color="#fff" />
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.iconBtn} onPress={showAttachMenu} disabled={!!editingId || uploading}>
              {uploading ? <ActivityIndicator color="#fff" /> : <Ionicons name="add-circle" size={28} color="#fff" />}
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={styles.input}
              placeholder={editingId ? "Editing message..." : replyTo ? "Reply to " + replyTo.senderName + "..." : "Message"}
              placeholderTextColor="rgba(255,255,255,0.6)"
              value={text}
              onChangeText={setText}
              multiline
            />
            {text.trim().length > 0 || editingId || pendingImages.length > 0 ? (
              <TouchableOpacity style={styles.sendBtn} onPress={send} disabled={uploading}>
                <Ionicons name={editingId ? "checkmark" : "send"} size={20} color="#0b6f8e" />
              </TouchableOpacity>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>

      <Modal visible={!!viewingImage} transparent={true} animationType="fade" onRequestClose={() => setViewingImage(null)}>
        <View style={styles.imageViewerOverlay}>
          <TouchableOpacity style={styles.imageViewerClose} onPress={() => setViewingImage(null)}>
            <Ionicons name="close-circle" size={36} color="#fff" />
          </TouchableOpacity>
          {viewingImage && <Image source={{ uri: viewingImage }} style={styles.fullImage} resizeMode="contain" />}
        </View>
      </Modal>

      <Modal visible={!!viewingFile} transparent={true} animationType="fade" onRequestClose={() => setViewingFile(null)}>
        <View style={styles.fileViewerOverlay}>
          <View style={styles.fileViewerHeader}>
            <Text style={styles.fileViewerTitle}>Viewing File</Text>
            <TouchableOpacity onPress={() => setViewingFile(null)}>
              <Ionicons name="close-circle" size={36} color="#fff" />
            </TouchableOpacity>
          </View>
          {viewingFile && <View style={styles.webviewContainer}><WebView source={{ uri: viewingFile }} /></View>}
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
                <TextInput style={styles.renameInput} value={newName} onChangeText={setNewName} placeholder="Group name" placeholderTextColor="rgba(255,255,255,0.6)" />
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
                  const displayName = usersById[item.userId] ? usersById[item.userId].username : item.userId;
                  return (
                    <View style={styles.memberRow}>
                      <View style={styles.memberAvatar}><Text style={styles.memberAvatarText}>{displayName.charAt(0).toUpperCase()}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.memberName}>{displayName}</Text>
                        {item.isAdmin && <Text style={styles.adminTag}>Admin</Text>}
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
            
            {myIsAdmin && (
              <TouchableOpacity style={styles.clearChatBtn} onPress={doClearChat}>
                <Ionicons name="trash-outline" size={20} color="#ffb4b4" />
                <Text style={styles.clearChatText}>Clear entire chat</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity style={styles.leaveGroupBtn} onPress={doLeaveGroup}>
              <Ionicons name="log-out-outline" size={20} color="#ffb4b4" />
              <Text style={styles.clearChatText}>Leave Group</Text>
            </TouchableOpacity>

            {myIsAdmin && (
              <TouchableOpacity style={styles.deleteGroupBtn} onPress={doDeleteGroup}>
                <Ionicons name="trash-outline" size={20} color="#ff4d4d" />
                <Text style={{ color: "#ff4d4d", fontWeight: "600", fontSize: 14 }}>Delete Group</Text>
              </TouchableOpacity>
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
  systemRow: { justifyContent: "center", alignItems: "center", marginVertical: 8 },
  systemBubble: { backgroundColor: "rgba(255,255,255,0.1)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 4 },
  systemText: { color: "rgba(255,255,255,0.7)", fontSize: 12 },
  row: { marginVertical: 4, flexDirection: "row" },
  rowMine: { justifyContent: "flex-end" },
  rowOther: { justifyContent: "flex-start" },
  bubble: { maxWidth: "78%", borderRadius: 16, paddingHorizontal: 13, paddingVertical: 9 },
  bubbleMedia: { padding: 6, backgroundColor: "transparent", borderWidth: 0, overflow: "hidden" },
  bubbleMine: { backgroundColor: "#fff", borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: "rgba(255,255,255,0.18)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderBottomLeftRadius: 4 },
  sender: { color: "#9fe6d4", fontSize: 11, fontWeight: "700", marginBottom: 3 },
  bodyMine: { color: "#0b3a4a", fontSize: 15, flexShrink: 1 },
  bodyOther: { color: "#fff", fontSize: 15, flexShrink: 1 },
  replyBox: { borderLeftWidth: 3, borderLeftColor: "#0b6f8e", paddingLeft: 8, paddingVertical: 4, marginBottom: 6, borderRadius: 4 },
  replyBoxMine: { backgroundColor: "rgba(11, 111, 142, 0.1)" },
  replyBoxOther: { backgroundColor: "rgba(255,255,255,0.1)" },
  replyName: { fontSize: 12, fontWeight: "700" },
  replyNameMine: { color: "#0b6f8e" },
  replyNameOther: { color: "#9fe6d4" },
  replyText: { fontSize: 13, marginTop: 1 },
  replyTextMine: { color: "#555" },
  replyTextOther: { color: "rgba(255,255,255,0.8)" },
  empty: { color: "rgba(255,255,255,0.8)", textAlign: "center", marginTop: 30 },
  imageAttachment: { width: 200, height: 200, borderRadius: 12 },
  fileChip: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "rgba(255,255,255,0.14)", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, maxWidth: 220 },
  fileChipText: { color: "#fff", fontSize: 13, flexShrink: 1 },
  pendingTray: { paddingVertical: 10, paddingHorizontal: 12, backgroundColor: "rgba(0,0,0,0.2)" },
  pendingImageWrap: { position: "relative", marginRight: 10 },
  pendingImage: { width: 80, height: 80, borderRadius: 10 },
  removePendingBtn: { position: "absolute", top: -5, right: -5, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 11 },
  inputBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingTop: 8, backgroundColor: "rgba(0,0,0,0.15)" },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  input: { flex: 1, color: "#fff", fontSize: 15, maxHeight: 110, backgroundColor: "rgba(255,255,255,0.16)", borderWidth: 1, borderColor: "rgba(255,255,255,0.25)", borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.5)", justifyContent: "flex-end" },
  modalCard: { backgroundColor: "#0b3a4a", borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, maxHeight: "85%" },
  modalHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  modalTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  renameRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  renameInput: { flex: 1, backgroundColor: "rgba(255,255,255,0.14)", borderWidth: 1, borderColor: "rgba(255,255,255,0.3)", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, color: "#fff", fontSize: 14 },
  renameSaveBtn: { backgroundColor: "#fff", borderRadius: 10, paddingHorizontal: 16, alignItems: "center", justifyContent: "center" },
  renameSaveText: { color: "#0b6f8e", fontWeight: "600", fontSize: 14 },
  memberRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.12)" },
  memberAvatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#fff", alignItems: "center", justifyContent: "center" },
  memberAvatarText: { color: "#0b6f8e", fontSize: 16, fontWeight: "700" },
  memberName: { color: "#fff", fontSize: 15, fontWeight: "600" },
  adminTag: { color: "#9fe6d4", fontSize: 11, fontWeight: "700", marginTop: 2 },
  clearChatBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 20, paddingVertical: 12, borderRadius: 10, backgroundColor: "rgba(255,80,80,0.12)", borderWidth: 1, borderColor: "rgba(255,140,140,0.45)" },
  clearChatText: { color: "#ffb4b4", fontWeight: "600", fontSize: 14 },
  leaveGroupBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: "rgba(255,80,80,0.12)", borderWidth: 1, borderColor: "rgba(255,140,140,0.45)" },
  deleteGroupBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 10, paddingVertical: 12, borderRadius: 10, backgroundColor: "rgba(255,0,0,0.15)", borderWidth: 1, borderColor: "rgba(255,0,0,0.5)" },
  imageViewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)", justifyContent: "center", alignItems: "center" },
  fullImage: { width: "100%", height: "80%" },
  imageViewerClose: { position: "absolute", top: 60, right: 20, zIndex: 1 },
  fileViewerOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.95)", paddingTop: 60 },
  fileViewerHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingBottom: 10 },
  fileViewerTitle: { color: "#fff", fontSize: 18, fontWeight: "600" },
  webviewContainer: { flex: 1, backgroundColor: "#fff", margin: 10, borderRadius: 12, overflow: "hidden" }
});