package com.studysync.tutoring.vetting;

// Where a tutor application is in the vetting pipeline.
public enum ApplicationStatus {
    PENDING_TEST,   // must take (or retake) the test
    UNDER_REVIEW,   // passed the test -> waiting for admin decision
    APPROVED,       // admin approved -> tutor is now bookable/visible
    REJECTED,       // admin declined
    LOCKED_OUT      // failed all 3 attempts for this course
}
