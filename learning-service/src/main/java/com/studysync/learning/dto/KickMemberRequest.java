package com.studysync.learning.dto;
public record KickMemberRequest(String requestedBy, String targetUserId, String targetUsername) {}