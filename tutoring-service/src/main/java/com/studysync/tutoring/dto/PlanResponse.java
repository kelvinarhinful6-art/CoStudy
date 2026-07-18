package com.studysync.tutoring.dto;

// Pro plan info for the app to display. Price is dev-configurable.
public record PlanResponse(double price, String currency, int months) {}
