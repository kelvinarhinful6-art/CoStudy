package com.studysync.learning.chat;
import com.studysync.learning.exception.BadRequestException;
import com.studysync.learning.exception.NotFoundException;
import com.studysync.learning.group.StudyGroup;
import com.studysync.learning.group.StudyGroupRepository;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.handler.annotation.*;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.List;
import java.util.UUID;

@RestController
public class ChatController {
    private final ChatMessageRepository repo;
    private final SimpMessagingTemplate broker;
    private final StudyGroupRepository groupRepo;
    private final Path uploadDir = Paths.get("/app/uploads/chat");

    public ChatController(ChatMessageRepository repo, SimpMessagingTemplate broker, StudyGroupRepository groupRepo) {
        this.repo = repo;
        this.broker = broker;
        this.groupRepo = groupRepo;
        try { Files.createDirectories(uploadDir); } catch (IOException e) { throw new RuntimeException(e); }
    }

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
        if (in.replyToId() != null && !in.replyToId().isEmpty()) {
            m.setReplyToId(UUID.fromString(in.replyToId()));
            m.setReplyToName(in.replyToName());
            m.setReplyToBody(in.replyToBody());
        }
        ChatMessage saved = repo.save(m);
        broker.convertAndSend("/topic/group." + groupId, toView(saved));
    }

    @GetMapping("/api/groups/{groupId}/messages")
    public List<MessageView> history(@PathVariable String groupId) {
        return repo.findTop100ByGroupIdOrderBySentAtAsc(groupId).stream().map(this::toView).toList();
    }

    @PutMapping("/api/groups/{groupId}/messages/{messageId}")
    @Transactional
    public void editMessage(@PathVariable String groupId, @PathVariable UUID messageId, @RequestBody EditRequest req) {
        ChatMessage m = repo.findById(messageId).orElseThrow(() -> new NotFoundException("message not found"));
        if (!m.getSenderId().equals(req.requestedBy())) throw new BadRequestException("can only edit your own messages");
        m.setBody(req.newBody());
        repo.save(m);
        broker.convertAndSend("/topic/group." + groupId, toView(m));
    }

    @DeleteMapping("/api/groups/{groupId}/messages/{messageId}")
    @Transactional
    public void deleteMessage(@PathVariable String groupId, @PathVariable UUID messageId, @RequestParam String requestedBy) {
        ChatMessage m = repo.findById(messageId).orElseThrow(() -> new NotFoundException("message not found"));
        if (!m.getSenderId().equals(requestedBy)) throw new BadRequestException("can only delete your own messages");
        repo.delete(m);
        MessageView deletedEvent = new MessageView(m.getMessageId().toString(), m.getGroupId(), m.getSenderId(), m.getSenderName(), null, null, null, null, m.getSentAt().toString(), true, false, null, null, null, false, null);
        broker.convertAndSend("/topic/group." + groupId, deletedEvent);
    }

    @DeleteMapping("/api/groups/{groupId}/messages")
    @Transactional
    public void clearChat(@PathVariable String groupId, @RequestParam String requestedBy) {
        StudyGroup g = groupRepo.findById(UUID.fromString(groupId)).orElseThrow(() -> new NotFoundException("group not found"));
        if (!g.getCreatedBy().equals(requestedBy)) throw new BadRequestException("only admin can clear chat");
        repo.deleteAllByGroupId(groupId);
        MessageView clearEvent = new MessageView(null, groupId, null, null, null, null, null, null, null, false, true, null, null, null, false, null);
        broker.convertAndSend("/topic/group." + groupId, clearEvent);
    }

    @PostMapping("/api/groups/{groupId}/upload")
    public UploadResponse upload(@PathVariable String groupId, @RequestParam("file") MultipartFile file) throws IOException {
        String original = file.getOriginalFilename() != null ? file.getOriginalFilename() : "file";
        String ext = original.contains(".") ? original.substring(original.lastIndexOf(".")) : "";
        String storedName = UUID.randomUUID() + ext;
        Files.copy(file.getInputStream(), uploadDir.resolve(storedName), StandardCopyOption.REPLACE_EXISTING);
        return new UploadResponse("/uploads/chat/" + storedName, original, file.getContentType());
    }

    @GetMapping("/uploads/chat/{filename}")
    public ResponseEntity<Resource> serve(@PathVariable String filename) throws IOException {
        Path file = uploadDir.resolve(filename);
        Resource resource = new UrlResource(file.toUri());
        if (!resource.exists()) return ResponseEntity.notFound().build();
        String contentType = Files.probeContentType(file);
        if (contentType == null) contentType = "application/octet-stream";
        return ResponseEntity.ok().header(HttpHeaders.CACHE_CONTROL, "max-age=31536000").header(HttpHeaders.CONTENT_TYPE, contentType).body(resource);
    }

    @Transactional
    public void broadcastSystemMessage(String groupId, String text) {
        ChatMessage sys = new ChatMessage();
        sys.setGroupId(groupId);
        sys.setSystem(true);
        sys.setSystemText(text);
        ChatMessage saved = repo.save(sys);
        broker.convertAndSend("/topic/group." + groupId, toView(saved));
    }

    private MessageView toView(ChatMessage m) {
        String replyId = m.getReplyToId() != null ? m.getReplyToId().toString() : null;
        return new MessageView(m.getMessageId().toString(), m.getGroupId(), m.getSenderId(), m.getSenderName(), m.getBody(), m.getFileUrl(), m.getFileName(), m.getFileType(), m.getSentAt().toString(), false, false, replyId, m.getReplyToName(), m.getReplyToBody(), m.isSystem(), m.getSystemText());
    }

    public record IncomingMessage(String senderId, String senderName, String body, String fileUrl, String fileName, String fileType, String replyToId, String replyToName, String replyToBody) {}
    public record MessageView(String messageId, String groupId, String senderId, String senderName, String body, String fileUrl, String fileName, String fileType, String sentAt, boolean deleted, boolean clearAll, String replyToId, String replyToName, String replyToBody, boolean isSystem, String systemText) {}
    public record UploadResponse(String fileUrl, String fileName, String fileType) {}
    public record EditRequest(String requestedBy, String newBody) {}
}