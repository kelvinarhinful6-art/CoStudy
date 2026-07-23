package com.studysync.learning.chat;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, UUID> {
    List<ChatMessage> findTop100ByGroupIdOrderBySentAtAsc(String groupId);
    void deleteAllByGroupId(String groupId);

    /** Returns all distinct groupIds whose name starts with 'support.' and ends with '.{adminId}'.
     *  These are the individual 1-on-1 rooms each user has with that admin. */
    @Query("SELECT DISTINCT m.groupId FROM ChatMessage m WHERE m.groupId LIKE 'support.%' AND m.groupId LIKE %:suffix")
    List<String> findSupportRoomsByAdminSuffix(@Param("suffix") String suffix);

    /** Latest message in each support room so the admin sees a preview. */
    @Query("SELECT m FROM ChatMessage m WHERE m.groupId = :groupId ORDER BY m.sentAt DESC LIMIT 1")
    java.util.Optional<ChatMessage> findLatestByGroupId(@Param("groupId") String groupId);

    /**
     * First message ever sent by a specific user in a given room.
     * Used to resolve the user's display name for the support inbox title —
     * so the label always shows the USER's name regardless of who replied last.
     */
    @Query("SELECT m FROM ChatMessage m WHERE m.groupId = :groupId AND m.senderId = :senderId ORDER BY m.sentAt ASC LIMIT 1")
    java.util.Optional<ChatMessage> findFirstBySenderInGroup(@Param("groupId") String groupId, @Param("senderId") String senderId);
}