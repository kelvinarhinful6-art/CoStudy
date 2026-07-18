package com.studysync.learning.invite;

import com.studysync.learning.exception.NotFoundException;
import com.studysync.learning.service.GroupService;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/invites")
public class InviteController {

    private final GroupInviteRepository repo;
    private final GroupService groupService;

    public InviteController(GroupInviteRepository repo, GroupService groupService) {
        this.repo = repo;
        this.groupService = groupService;
    }

    // Send an invite to a user for a group.
    @PostMapping
    public InviteView send(@RequestBody SendInvite in) {
        GroupInvite inv = new GroupInvite();
        inv.setGroupId(UUID.fromString(in.groupId()));
        inv.setGroupName(in.groupName());
        inv.setFromUserId(in.fromUserId());
        inv.setFromUsername(in.fromUsername());
        inv.setToUserId(in.toUserId());
        inv.setStatus("PENDING");
        return toView(repo.save(inv));
    }

    // My pending invites.
    @GetMapping
    public List<InviteView> mine(@RequestParam String userId) {
        return repo.findByToUserIdAndStatus(userId, "PENDING").stream().map(this::toView).toList();
    }

    // Accept: join the group, mark accepted.
    @PostMapping("/{id}/accept")
    public void accept(@PathVariable UUID id) {
        GroupInvite inv = repo.findById(id).orElseThrow(() -> new NotFoundException("invite not found"));
        groupService.join(inv.getGroupId(), inv.getToUserId());
        inv.setStatus("ACCEPTED");
        repo.save(inv);
    }

    // Decline.
    @PostMapping("/{id}/decline")
    public void decline(@PathVariable UUID id) {
        GroupInvite inv = repo.findById(id).orElseThrow(() -> new NotFoundException("invite not found"));
        inv.setStatus("DECLINED");
        repo.save(inv);
    }

    private InviteView toView(GroupInvite i) {
        return new InviteView(i.getInviteId().toString(), i.getGroupId().toString(),
            i.getGroupName(), i.getFromUserId(), i.getFromUsername(), i.getToUserId(), i.getStatus());
    }

    public record SendInvite(String groupId, String groupName, String fromUserId, String fromUsername, String toUserId) {}
    public record InviteView(String inviteId, String groupId, String groupName, String fromUserId, String fromUsername, String toUserId, String status) {}
}