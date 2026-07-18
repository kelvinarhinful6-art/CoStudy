package com.studysync.learning.invite;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface GroupInviteRepository extends JpaRepository<GroupInvite, UUID> {
    List<GroupInvite> findByToUserIdAndStatus(String toUserId, String status);
    boolean existsByGroupIdAndToUserIdAndStatus(UUID groupId, String toUserId, String status);
}