package com.studysync.learning.group;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
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

    @Modifying
    @Query("DELETE FROM GroupMember g WHERE g.groupId = :groupId AND g.userId = :userId")
    void deleteByGroupIdAndUserId(@Param("groupId") UUID groupId, @Param("userId") String userId);

    @Modifying
    @Query("DELETE FROM GroupMember g WHERE g.groupId = :groupId")
    void deleteByGroupId(@Param("groupId") UUID groupId);
}