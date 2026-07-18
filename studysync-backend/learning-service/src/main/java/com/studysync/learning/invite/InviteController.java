package com.studysync.learning.invite;

import com.studysync.learning.exception.BadRequestException;
import com.studysync.learning.exception.NotFoundException;
import com.studysync.learning.group.GroupMember;
import com.studysync.learning.group.GroupMemberRepository;
import com.studysync.learning.service.GroupService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/invites")
public class InviteController {
    private final GroupInviteRepository invites;
    private final GroupMemberRepository members;
    private final GroupService groupService;

    public InviteController(GroupInviteRepository invites, GroupMemberRepository members, GroupService groupService) {
        this.invites = invites;
        this.members = members;
        this.groupService = groupService;
    }

    @PostMapping
    public GroupInvite send(@RequestBody SendInviteRequest req) {
        if (req.fromUserId.equals(req.toUserId)) throw new BadRequestException("Cannot invite yourself");
        GroupInvite invite = new GroupInvite();
        invite.setGroupId(UUID.fromString(req.groupId));
        invite.setGroupName(req.groupName);
        invite.setFromUserId(req.fromUserId);
        invite.setFromUsername(req.fromUsername);
        invite.setToUserId(req.toUserId);
        invite.setStatus("PENDING");
        return invites.save(invite);
    }

    @GetMapping
    public List<GroupInvite> myInvites(@RequestParam String userId) {
        return invites.findByToUserIdAndStatus(userId, "PENDING");
    }

    @PostMapping("/{inviteId}/accept")
    public void accept(@PathVariable UUID inviteId, @RequestBody(required = false) AcceptInviteRequest req) {
        GroupInvite invite = invites.findById(inviteId)
                .orElseThrow(() -> new NotFoundException("invite not found"));
        if (!"PENDING".equals(invite.getStatus())) throw new BadRequestException("invite already handled");
        
        invite.setStatus("ACCEPTED");
        invites.save(invite);

        // Use the username of the person ACCEPTING the invite, not the one who sent it
        String joinerName = (req != null && req.username() != null && !req.username().isEmpty()) ? req.username() : "A new member";
        groupService.join(invite.getGroupId(), invite.getToUserId(), joinerName);
    }

    @PostMapping("/{inviteId}/decline")
    public void decline(@PathVariable UUID inviteId) {
        GroupInvite invite = invites.findById(inviteId)
                .orElseThrow(() -> new NotFoundException("invite not found"));
        invite.setStatus("DECLINED");
        invites.save(invite);
    }

    public record SendInviteRequest(String groupId, String groupName, String fromUserId, String fromUsername, String toUserId) {}
    public record AcceptInviteRequest(String username) {}
}