package com.studysync.learning.web;

import com.studysync.learning.dto.*;
import com.studysync.learning.service.GroupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/groups")
public class GroupController {
    private final GroupService service;
    public GroupController(GroupService service) { this.service = service; }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GroupResponse create(@Valid @RequestBody CreateGroupRequest req) { return service.create(req); }

    @PostMapping("/{groupId}/members")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void join(@PathVariable UUID groupId, @Valid @RequestBody JoinGroupRequest req) { service.join(groupId, req.userId(), req.username()); }

    @PostMapping("/{groupId}/leave")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(@PathVariable UUID groupId, @Valid @RequestBody LeaveGroupRequest req) { service.leave(groupId, req.userId(), req.username()); }

    @DeleteMapping("/{groupId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable UUID groupId, @RequestParam String requestedBy) { service.deleteGroup(groupId, requestedBy); }

    @GetMapping("/mine")
    public List<GroupResponse> mine(@RequestParam String userId) { return service.myGroups(userId); }

    @GetMapping("/suggestions")
    public List<GroupResponse> suggestions(@RequestParam String courseId) { return service.suggestions(courseId); }

    @GetMapping("/{groupId}/members")
    public List<MemberResponse> members(@PathVariable UUID groupId) { return service.getMembers(groupId); }

    @PatchMapping("/{groupId}/name")
    public GroupResponse rename(@PathVariable UUID groupId, @Valid @RequestBody RenameGroupRequest req) { return service.rename(groupId, req.requestedBy(), req.newName(), req.requestedByName()); }

    @PostMapping("/{groupId}/kick")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void kick(@PathVariable UUID groupId, @Valid @RequestBody KickMemberRequest req) { service.kick(groupId, req.requestedBy(), req.targetUserId(), req.targetUsername()); }
}