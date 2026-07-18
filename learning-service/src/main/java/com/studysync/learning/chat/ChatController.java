package com.studysync.learning.chat;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

// Live chat: receive a message over WebSocket, save it, broadcast to the group.
@RestController
public class ChatController {
    private final ChatMessageRepository repo;
    private final SimpMessagingTemplate broker;
    private final Path uploadDir = Paths.get("/app/uploads/chat");

    // In-memory presence: groupId -> set of currently-online userIds. Resets on service restart.
    private final java.util.Map<String, Set<String>> onlineByGroup = new ConcurrentHashMap<>();

    public ChatController(ChatMessageRepository repo, SimpMessagingTemplate broker) {
        this.repo = repo;
        this.broker = broker;
        try { Files.createDirectories(uploadDir); } catch (IOException e) { throw new RuntimeException(e); }
    }

    // Client announces presence when opening a group chat.
    @MessageMapping("/group/{groupId}/presence")
    public void presence(@DestinationVariable String groupId, PresenceMessage in) {
        Set<String> set = onlineByGroup.computeIfAbsent(groupId, k -> ConcurrentHashMap.newKeySet());
        if (in.online()) set.add(in.userId()); else set.remove(in.userId());
        broker.convertAndSend("/topic/group." + groupId + ".presence", Set.copyOf(set));
    }

    // Client sends to /app/group/{groupId}; we save and broadcast to /topic/group.{groupId}
    @MessageMapping("/group/{groupId}")
    public void handle(@DestinationVariable String groupId, IncomingMessage in) {
        ChatMessage m = new ChatMessage();
        m.setGroupId(groupId);
        m.setSenderId(in.senderId());
        m.setSenderName(in.senderName());
        m.setBody(in.body());
        m.setFileUrl(in.fileUrl());
        m.setFileName(in.fileName());
        m.setFileType(in.fileType());
        ChatMessage saved = repo.save(m);
        broker.convertAndSend("/topic/group." + groupId, toView(saved));
    }

    // Load recent history when opening a group chat.
    @GetMapping("/api/groups/{groupId}/messages")
    public List<MessageView> history(@PathVariable String groupId) {
        return repo.findTop100ByGroupIdOrderBySentAtAsc(groupId).stream().map(this::toView).toList();
    }

    // Upload a file/image for chat. Returns a URL the app can attach to a message.
    @PostMapping("/api/groups/{groupId}/upload")
    public UploadResponse upload(@PathVariable String groupId, @RequestParam("file") MultipartFile file) throws IOException {
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String ext = original.contains(".") ? original.substring(original.lastIndexOf(".")) : "";
        String storedName = UUID.randomUUID() + ext;
        Path target = uploadDir.resolve(storedName);
        Files.copy(file.getInputStream(), target, StandardCopyOption.REPLACE_EXISTING);
        String url = "/uploads/chat/" + storedName;
        return new UploadResponse(url, original, file.getContentType());
    }

    // Serve uploaded chat files, with the correct content type so images/PDFs render properly.
    @GetMapping("/uploads/chat/{filename}")
    public ResponseEntity<Resource> serve(@PathVariable String filename) throws IOException {
        Path file = uploadDir.resolve(filename);
        Resource resource = new UrlResource(file.toUri());
        if (!resource.exists()) return ResponseEntity.notFound().build();
        String contentType = Files.probeContentType(file);
        if (contentType == null) contentType = "application/octet-stream";
        return ResponseEntity.ok()
                .header(HttpHeaders.CACHE_CONTROL, "max-age=31536000")
                .header(HttpHeaders.CONTENT_TYPE, contentType)
                .body(resource);
    }

    // Delete a message. Only the original sender can delete their own message.
    @DeleteMapping("/api/groups/{groupId}/messages/{messageId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String groupId, @PathVariable UUID messageId, @RequestParam String requestedBy) {
        ChatMessage m = repo.findById(messageId)
                .orElseThrow(() -> new RuntimeException("message not found"));
        if (!m.getSenderId().equals(requestedBy)) {
            throw new RuntimeException("only the sender can delete this message");
        }
        repo.deleteById(messageId);
        broker.convertAndSend("/topic/group." + groupId + ".delete", messageId.toString());
    }

    private MessageView toView(ChatMessage m) {
        return new MessageView(
            m.getMessageId().toString(), m.getGroupId(), m.getSenderId(),
            m.getSenderName(), m.getBody(), m.getFileUrl(), m.getFileName(), m.getFileType(),
            m.getSentAt().toString());
    }

    public record IncomingMessage(String senderId, String senderName, String body,
                                  String fileUrl, String fileName, String fileType) {}
    public record PresenceMessage(String userId, boolean online) {}
    public record MessageView(String messageId, String groupId, String senderId,
                              String senderName, String body, String fileUrl, String fileName,
                              String fileType, String sentAt) {}
    public record UploadResponse(String fileUrl, String fileName, String fileType) {}
}