package com.studysync.learning.chat;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "chat_message", schema = "learning")
public class ChatMessage {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "message_id")
    private UUID messageId;
    @Column(name = "group_id", nullable = false)
    private String groupId;
    @Column(name = "sender_id")
    private String senderId; // Removed nullable = false
    @Column(name = "sender_name")
    private String senderName;
    @Column(length = 2000)
    private String body;
    @Column(name = "file_url")
    private String fileUrl;
    @Column(name = "file_name")
    private String fileName;
    @Column(name = "file_type")
    private String fileType;
    @Column(name = "reply_to_id")
    private UUID replyToId;
    @Column(name = "reply_to_name")
    private String replyToName;
    @Column(name = "client_id")
    private String clientId; // client-generated id, used to de-duplicate echoes / optimistic sends
    @Column(name = "reply_to_body")
    private String replyToBody;
    @Column(name = "is_system")
    private Boolean isSystem = false;
    @Column(name = "system_text")
    private String systemText;
    @Column(name = "sent_at", nullable = false, updatable = false)
    private Instant sentAt;
    @PrePersist void onCreate() { if (sentAt == null) sentAt = Instant.now(); }
    public UUID getMessageId() { return messageId; }
    public String getGroupId() { return groupId; }
    public void setGroupId(String v) { this.groupId = v; }
    public String getSenderId() { return senderId; }
    public void setSenderId(String v) { this.senderId = v; }
    public String getSenderName() { return senderName; }
    public void setSenderName(String v) { this.senderName = v; }
    public String getBody() { return body; }
    public void setBody(String v) { this.body = v; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String v) { this.fileUrl = v; }
    public String getFileName() { return fileName; }
    public void setFileName(String v) { this.fileName = v; }
    public String getFileType() { return fileType; }
    public void setFileType(String v) { this.fileType = v; }
    public UUID getReplyToId() { return replyToId; }
    public void setReplyToId(UUID v) { this.replyToId = v; }
    public String getClientId() { return clientId; }
    public void setClientId(String v) { this.clientId = v; }
    public String getReplyToName() { return replyToName; }
    public void setReplyToName(String v) { this.replyToName = v; }
    public String getReplyToBody() { return replyToBody; }
    public void setReplyToBody(String v) { this.replyToBody = v; }
    public boolean isSystem() { return Boolean.TRUE.equals(isSystem); }
    public void setSystem(boolean v) { this.isSystem = v; }
    public String getSystemText() { return systemText; }
    public void setSystemText(String v) { this.systemText = v; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant v) { this.sentAt = v; }
}