package com.studysync.shared;

import java.time.Instant;

/**
 * The standard "error envelope" every StudySync service returns when
 * something goes wrong. Same shape everywhere = the mobile app handles
 * all errors the same way.
 */
public record ApiError(
        Instant timestamp,
        int status,
        String error,
        String code,
        String message,
        String path
) {
}
