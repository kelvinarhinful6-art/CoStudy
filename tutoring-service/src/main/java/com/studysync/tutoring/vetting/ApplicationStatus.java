package com.studysync.tutoring.vetting;

// Where a tutor application is in the vetting pipeline.
// The process is documents-only: applicants download the subject's assessment
// PDF, solve it, and upload it together with their CV / transcript / supporting
// documents for manual admin review.
public enum ApplicationStatus {
    AWAITING_DOCUMENTS,  // application created -> upload documents, then submit
    UNDER_REVIEW,        // documents submitted -> waiting for admin decision
    APPROVED,            // admin approved -> tutor is now bookable/visible
    REJECTED,            // admin declined
    RESIGNED             // tutor voluntarily stepped down
}
