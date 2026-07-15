package com.studysync.learning.web;

import com.studysync.learning.service.GroupService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

// Find People section: discover students on the same course.
@RestController
@RequestMapping("/api/matching")
public class MatchController {

    private final GroupService service;
    public MatchController(GroupService service) { this.service = service; }

    @GetMapping("/people")
    public List<String> people(@RequestParam String courseId,
                               @RequestParam(required = false) String excludeUserId) {
        return service.findPeople(courseId, excludeUserId);
    }
}
