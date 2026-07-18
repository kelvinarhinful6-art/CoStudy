package com.studysync.learning.web;

import com.studysync.learning.dto.CreateGroupRequest;
import com.studysync.learning.dto.GroupResponse;
import com.studysync.learning.dto.JoinGroupRequest;
import com.studysync.learning.dto.KickMemberRequest;
import com.studysync.learning.dto.MemberResponse;
import com.studysync.learning.dto.RenameGroupRequest;
import com.studysync.learning.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

// Groups section endpoints.
@RestController
@RequestMapping("/api/groups")
public class GroupController {

    private final GroupService service;
    public GroupController(GroupService service) { this.service = service; }

    @PostMapping                                   // create a group
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse create(@Valid @RequestBody CreateGroupRequest req) {
        return service.create(req);
    }

    @PostMapping("/{groupId}/members")             // join a group
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void join(@PathVariable UUID groupId, @Valid @RequestBody JoinGroupRequest req) {
        service.join(groupId, req.userId());
        service.announceJoin(groupId, req.username());
    }

    @GetMapping("/mine")                            // groups I belong to
    public List<GroupResponse> mine(@RequestParam String userId) {
        return service.myGroups(userId);
    }

    @GetMapping("/suggestions")                     // suggested groups for a course
    public List<GroupResponse> suggestions(@RequestParam String courseId) {
        return service.suggestions(courseId);
    }

    @GetMapping("/{groupId}/members")               // list members (with admin flag)
    public List<MemberResponse> members(@PathVariable UUID groupId) {
        return service.getMembers(groupId);
    }

    @PatchMapping("/{groupId}/name")                // rename group (admin only)
    public GroupResponse rename(@PathVariable UUID groupId, @Valid @RequestBody RenameGroupRequest req) {
        return service.rename(groupId, req.requestedBy(), req.newName());
    }

    @PostMapping("/{groupId}/kick")                 // remove a member (admin only)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void kick(@PathVariable UUID groupId, @Valid @RequestBody KickMemberRequest req) {
        service.kick(groupId, req.requestedBy(), req.targetUserId());
    }
}