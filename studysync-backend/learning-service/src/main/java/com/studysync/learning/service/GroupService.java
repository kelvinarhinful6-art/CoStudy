package com.studysync.learning.service;

import com.studysync.learning.chat.ChatController;
import com.studysync.learning.dto.CreateGroupRequest;
import com.studysync.learning.dto.GroupResponse;
import com.studysync.learning.dto.MemberResponse;
import com.studysync.learning.exception.BadRequestException;
import com.studysync.learning.exception.NotFoundException;
import com.studysync.learning.group.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class GroupService {
    private final StudyGroupRepository groups;
    private final GroupMemberRepository members;
    private final ChatController chatController;

    public GroupService(StudyGroupRepository groups, GroupMemberRepository members, ChatController chatController) {
        this.groups = groups;
        this.members = members;
        this.chatController = chatController;
    }

    @Transactional
    public GroupResponse create(CreateGroupRequest req) {
        StudyGroup g = new StudyGroup();
        g.setGroupName(req.groupName());
        g.setCourseId(req.courseId());
        g.setCreatedBy(req.createdBy());
        g.setDescription(req.description());
        groups.save(g);
        GroupMember creatorMembership = new GroupMember();
        creatorMembership.setGroupId(g.getGroupId());
        creatorMembership.setUserId(req.createdBy());
        members.save(creatorMembership);
        return toResponse(g);
    }

    @Transactional
    public void join(UUID groupId, String userId, String username) {
        StudyGroup g = groups.findById(groupId).orElseThrow(() -> new NotFoundException("group not found"));
        if (members.existsByGroupIdAndUserId(g.getGroupId(), userId)) throw new BadRequestException("already a member");
        GroupMember m = new GroupMember();
        m.setGroupId(g.getGroupId());
        m.setUserId(userId);
        members.save(m);
        String name = (username == null || username.isEmpty()) ? "A new member" : username;
        chatController.broadcastSystemMessage(groupId.toString(), name + " joined the group");
    }

    @Transactional
    public void leave(UUID groupId, String userId, String username) {
        StudyGroup g = groups.findById(groupId).orElseThrow(() -> new NotFoundException("group not found"));
        if (g.getCreatedBy().equals(userId)) throw new BadRequestException("Admin cannot leave. Transfer ownership or delete the group.");
        if (!members.existsByGroupIdAndUserId(groupId, userId)) throw new NotFoundException("not a member");
        members.deleteByGroupIdAndUserId(groupId, userId);
        chatController.broadcastSystemMessage(groupId.toString(), username + " left the group");
    }

    @Transactional
    public void deleteGroup(UUID groupId, String requestedBy) {
        StudyGroup g = groups.findById(groupId).orElseThrow(() -> new NotFoundException("group not found"));
        if (!g.getCreatedBy().equals(requestedBy)) throw new BadRequestException("only admin can delete the group");
        members.deleteByGroupId(groupId);
        groups.delete(g);
        chatController.broadcastSystemMessage(groupId.toString(), "Group deleted by admin");
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> myGroups(String userId) {
        return members.findByUserId(userId).stream().map(GroupMember::getGroupId).map(gid -> groups.findById(gid).orElse(null)).filter(Objects::nonNull).map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<GroupResponse> suggestions(String courseId) {
        return groups.findByCourseId(courseId).stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<String> findPeople(String courseId, String excludeUserId) {
        List<UUID> groupIds = groups.findByCourseId(courseId).stream().map(StudyGroup::getGroupId).toList();
        if (groupIds.isEmpty()) return List.of();
        return members.findByGroupIdIn(groupIds).stream()
                .map(GroupMember::getUserId)
                .filter(uid -> excludeUserId == null || !uid.equals(excludeUserId))
                .distinct()
                .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(UUID groupId) {
        StudyGroup g = groups.findById(groupId).orElseThrow(() -> new NotFoundException("group not found"));
        return members.findByGroupId(groupId).stream().map(m -> new MemberResponse(m.getUserId(), m.getUserId().equals(g.getCreatedBy()))).toList();
    }

    @Transactional
    public GroupResponse rename(UUID groupId, String requestedBy, String newName, String requestedByName) {
        StudyGroup g = groups.findById(groupId).orElseThrow(() -> new NotFoundException("group not found"));
        if (!g.getCreatedBy().equals(requestedBy)) throw new BadRequestException("only admin can rename");
        if (newName == null || newName.isBlank()) throw new BadRequestException("name cannot be empty");
        g.setGroupName(newName.trim());
        groups.save(g);
        chatController.broadcastSystemMessage(groupId.toString(), requestedByName + " changed group name to " + newName.trim());
        return toResponse(g);
    }

    @Transactional
    public void kick(UUID groupId, String requestedBy, String targetUserId, String targetUsername) {
        StudyGroup g = groups.findById(groupId).orElseThrow(() -> new NotFoundException("group not found"));
        if (!g.getCreatedBy().equals(requestedBy)) throw new BadRequestException("only admin can remove members");
        if (g.getCreatedBy().equals(targetUserId)) throw new BadRequestException("cannot remove admin");
        if (!members.existsByGroupIdAndUserId(groupId, targetUserId)) throw new NotFoundException("not a member");
        members.deleteByGroupIdAndUserId(groupId, targetUserId);
        chatController.broadcastSystemMessage(groupId.toString(), targetUsername + " was removed by admin");
    }

    private GroupResponse toResponse(StudyGroup g) {
        return new GroupResponse(g.getGroupId().toString(), g.getGroupName(), g.getCourseId(), g.getCreatedBy(), g.getDescription(), members.countByGroupId(g.getGroupId()));
    }
}