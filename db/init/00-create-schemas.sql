-- Runs automatically the FIRST time the PostgreSQL container starts.
-- One database, one schema (a separate room) per service.

CREATE SCHEMA IF NOT EXISTS auth;        -- auth-service: users, login, courses, profiles
CREATE SCHEMA IF NOT EXISTS learning;    -- learning-service: study sessions, groups, matching
CREATE SCHEMA IF NOT EXISTS tutoring;    -- tutoring-service: tutors, vetting, bookings, reviews, payments
CREATE SCHEMA IF NOT EXISTS engagement;  -- engagement-service: notifications, analytics, ads
CREATE SCHEMA IF NOT EXISTS billing;     -- subscription plans + simulated subscription transactions

CREATE SCHEMA IF NOT EXISTS payment;   -- payment-service: paystack transactions, webhook logs
