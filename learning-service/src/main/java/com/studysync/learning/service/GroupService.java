package com.studysync.learning.service;

import com.studysync.learning.dto.CreateGroupRequest;
import com.studysync.learning.dto.GroupResponse;
import com.studysync.learning.dto.MemberResponse;
import com.studysync.learning.exception.BadRequestException;
import com.studysync.learning.exception.NotFoundException;
import com.studysync.learning.chat.ChatMessage;
import com.studysync.learning.chat.ChatMessageRepository;
import com.studysync.learning.group.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class GroupService {

    private final StudyGroupRepository groups;
    private final GroupMemberRepository members;
    private final ChatMessageRepository chatMessages;
    private final SimpMessagingTemplate broker;
    private final long freeMaxGroups;   // free plan cap (Pro lifts this later)

    public GroupService(StudyGroupRepository groups,
                        GroupMemberRepository members,
                        ChatMessageRepository chatMessages,
                        SimpMessagingTemplate broker,
                        @Value("${free.max-groups:3}") long freeMaxGroups) {
        this.groups = groups;
        this.members = members;
        this.chatMessages = chatMessages;
        this.broker = broker;
        this.freeMaxGroups = freeMaxGroups;
    }

    // Create a group. Free plan: max 3 created groups.
    @Transactional
    public GroupResponse create(CreateGroupRequest req) {
        if (groups.countByCreatedBy(req.createdBy()) >= freeMaxGroups) {
            throw new BadRequestException("free plan limit reached: max " + freeMaxGroups
                    + " created groups (upgrade to Pro)");
        }
        StudyGroup g = new StudyGroup();
        g.setGroupName(req.groupName());
        g.setCourseId(req.courseId());
        g.setCreatedBy(req.createdBy());
        g.setDescription(req.description());
        groups.save(g);

        // auto-add creator as a member so they appear in the members list
        GroupMember creatorMembership = new GroupMember();
        creatorMembership.setGroupId(g.getGroupId());
        creatorMembership.setUserId(req.createdBy());
        members.save(creatorMembership);

        return toResponse(g);
    }

    // Join a group. Free plan: max 3 joined groups; no duplicate membership.
    @Transactional
    public void join(UUID groupId, String userId) {
        StudyGroup g = groups.findById(groupId)
                .orElseThrow(() -> new NotFoundException("group not found"));
        if (members.existsByGroupIdAndUserId(g.getGroupId(), userId)) {
            throw new BadRequestException("already a member of this group");
        }
        if (members.countByUserId(userId) >= freeMaxGroups) {
            throw new BadRequestException("free plan limit reached: max " + freeMaxGroups
                    + " joined groups (upgrade to Pro)");
        }
        GroupMember m = new GroupMember();
        m.setGroupId(g.getGroupId());
        m.setUserId(userId);
        members.save(m);
    }

    // Post a system message announcing a new member, broadcast live to the group chat.
    @Transactional
    public void announceJoin(UUID groupId, String username) {
        String name = (username == null || username.isBlank()) ? "Someone" : username;
        ChatMessage m = new ChatMessage();
        m.setGroupId(groupId.toString());
        m.setSenderId("system");
        m.setSenderName("System");
        m.setBody(name + " just joined chat lets rock !!");
        ChatMessage saved = chatMessages.save(m);
        broker.convertAndSend("/topic/group." + groupId, new com.studysync.learning.chat.ChatController.MessageView(
                saved.getMessageId().toString(), saved.getGroupId(), saved.getSenderId(),
                saved.getSenderName(), saved.getBody(), saved.getFileUrl(), saved.getFileName(),
                saved.getFileType(), saved.getSentAt().toString()));
    }

    // Groups a user belongs to.
    @Transactional(readOnly = true)
    public List<GroupResponse> myGroups(String userId) {
        List<UUID> ids = members.findByUserId(userId).stream()
                .map(GroupMember::getGroupId).toList();
        return groups.findAllById(ids).stream().map(this::toResponse).toList();
    }

    // Suggested groups for a course.
    @Transactional(readOnly = true)
    public List<GroupResponse> suggestions(String courseId) {
        return groups.findByCourseId(courseId).stream().map(this::toResponse).toList();
    }

    // "Find People": other users studying the same course (via group membership).
    @Transactional(readOnly = true)
    public List<String> findPeople(String courseId, String excludeUserId) {
        List<UUID> groupIds = groups.findByCourseId(courseId).stream()
                .map(StudyGroup::getGroupId).toList();
        if (groupIds.isEmpty()) return List.of();
        return members.findByGroupIdIn(groupIds).stream()
                .map(GroupMember::getUserId)
                .filter(uid -> excludeUserId == null || !uid.equals(excludeUserId))
                .distinct()
                .collect(Collectors.toList());
    }

    // List members of a group, flagging the creator as admin.
    @Transactional(readOnly = true)
    public List<MemberResponse> getMembers(UUID groupId) {
        StudyGroup g = groups.findById(groupId)
                .orElseThrow(() -> new NotFoundException("group not found"));
        return members.findByGroupId(groupId).stream()
                .map(m -> new MemberResponse(m.getUserId(), m.getUserId().equals(g.getCreatedBy())))
                .toList();
    }

    // Rename a group. Only the creator (admin) can do this.
    @Transactional
    public GroupResponse rename(UUID groupId, String requestedBy, String newName) {
        StudyGroup g = groups.findById(groupId)
                .orElseThrow(() -> new NotFoundException("group not found"));
        if (!g.getCreatedBy().equals(requestedBy)) {
            throw new BadRequestException("only the group admin can rename this group");
        }
        if (newName == null || newName.isBlank()) {
            throw new BadRequestException("group name cannot be empty");
        }
        g.setGroupName(newName.trim());
        groups.save(g);
        return toResponse(g);
    }

    // Kick a member. Only the creator (admin) can do this; admin cannot kick themselves.
    @Transactional
    public void kick(UUID groupId, String requestedBy, String targetUserId) {
        StudyGroup g = groups.findById(groupId)
                .orElseThrow(() -> new NotFoundException("group not found"));
        if (!g.getCreatedBy().equals(requestedBy)) {
            throw new BadRequestException("only the group admin can remove members");
        }
        if (g.getCreatedBy().equals(targetUserId)) {
            throw new BadRequestException("the group admin cannot remove themselves");
        }
        if (!members.existsByGroupIdAndUserId(groupId, targetUserId)) {
            throw new NotFoundException("that user is not a member of this group");
        }
        members.deleteByGroupIdAndUserId(groupId, targetUserId);
    }

    private GroupResponse toResponse(StudyGroup g) {
        return new GroupResponse(
                g.getGroupId().toString(), g.getGroupName(), g.getCourseId(),
                g.getCreatedBy(), g.getDescription(), members.countByGroupId(g.getGroupId()));
    }
}