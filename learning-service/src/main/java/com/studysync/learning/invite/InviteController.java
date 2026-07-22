package com.studysync.learning.invite;

import com.studysync.learning.exception.BadRequestException;
import com.studysync.learning.exception.NotFoundException;
import com.studysync.learning.group.GroupMemberRepository;
import com.studysync.learning.group.StudyGroup;
import com.studysync.learning.group.StudyGroupRepository;
import com.studysync.learning.notify.NotificationClient;
import com.studysync.learning.service.GroupService;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/invites")
public class InviteController {
    private final GroupInviteRepository invites;
    private final GroupMemberRepository members;
    private final StudyGroupRepository groups;
    private final GroupService groupService;
    private final NotificationClient notifier;

    public InviteController(GroupInviteRepository invites, GroupMemberRepository members,
                            StudyGroupRepository groups, GroupService groupService,
                            NotificationClient notifier) {
        this.invites = invites;
        this.members = members;
        this.groups = groups;
        this.groupService = groupService;
        this.notifier = notifier;
    }

    @PostMapping
    public GroupInvite send(@RequestBody SendInviteRequest req) {
        if (req.fromUserId.equals(req.toUserId)) throw new BadRequestException("Cannot invite yourself");

        StudyGroup g = groups.findById(UUID.fromString(req.groupId))
                .orElseThrow(() -> new NotFoundException("group not found"));
        // The inviter must actually belong to the group.
        if (!members.existsByGroupIdAndUserId(g.getGroupId(), req.fromUserId))
            throw new BadRequestException("You can only invite to groups you belong to");

        // Prevent duplicate pending invites for the same group + user.
        if (invites.existsByGroupIdAndToUserIdAndStatus(g.getGroupId(), req.toUserId, "PENDING"))
            throw new BadRequestException("Already invited — waiting for a response");

        GroupInvite invite = new GroupInvite();
        invite.setGroupId(g.getGroupId());
        invite.setGroupName(g.getGroupName());
        invite.setFromUserId(req.fromUserId);
        invite.setFromUsername(req.fromUsername);
        invite.setToUserId(req.toUserId);
        invite.setStatus("PENDING");
        GroupInvite saved = invites.save(invite);

        String from = (req.fromUsername != null && !req.fromUsername.isEmpty()) ? req.fromUsername : "Someone";
        notifier.notify(req.toUserId, "INVITE", from + " invited you to " + g.getGroupName());
        return saved;
    }

    @GetMapping
    public List<GroupInvite> myInvites(@RequestParam String userId) {
        return invites.findByToUserIdAndStatus(userId, "PENDING");
    }

    // Idempotent + transactional: concurrent/duplicate accepts are safe and never clone a group.
    @PostMapping("/{inviteId}/accept")
    @Transactional
    public void accept(@PathVariable UUID inviteId, @RequestBody(required = false) AcceptInviteRequest req) {
        GroupInvite invite = invites.findById(inviteId)
                .orElseThrow(() -> new NotFoundException("invite not found"));

        // Already handled (concurrent accept, double-tap, or previously processed) -> no-op.
        if (!"PENDING".equals(invite.getStatus())) return;

        invite.setStatus("ACCEPTED");
        invites.save(invite);

        // Use the username of the person ACCEPTING the invite, not the one who sent it.
        String joinerName = (req != null && req.username() != null && !req.username().isEmpty())
                ? req.username() : "A new member";
        // join() is idempotent: if the user is somehow already a member we just skip.
        groupService.join(invite.getGroupId(), invite.getToUserId(), joinerName);
    }

    @PostMapping("/{inviteId}/decline")
    @Transactional
    public void decline(@PathVariable UUID inviteId) {
        GroupInvite invite = invites.findById(inviteId)
                .orElseThrow(() -> new NotFoundException("invite not found"));
        invite.setStatus("DECLINED");
        invites.save(invite);
    }

    public record SendInviteRequest(String groupId, String groupName, String fromUserId, String fromUsername, String toUserId) {}
    public record AcceptInviteRequest(String username) {}
}
