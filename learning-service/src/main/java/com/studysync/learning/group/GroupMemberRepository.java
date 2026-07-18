package com.studysync.learning.group;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Collection;
import java.util.List;
import java.util.UUID;
public interface GroupMemberRepository extends JpaRepository<GroupMember, UUID> {
    long countByUserId(String userId);
    boolean existsByGroupIdAndUserId(UUID groupId, String userId);
    long countByGroupId(UUID groupId);
    List<GroupMember> findByUserId(String userId);
    List<GroupMember> findByGroupIdIn(Collection<UUID> groupIds);
    List<GroupMember> findByGroupId(UUID groupId);
    void deleteByGroupIdAndUserId(UUID groupId, String userId);
}