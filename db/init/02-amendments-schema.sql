-- Amendments Schema Migrations

-- 1A. Escrow columns for payment.payment_transactions
ALTER TABLE payment.payment_transactions ADD COLUMN IF NOT EXISTS escrow_status VARCHAR(30) DEFAULT 'HELD';
ALTER TABLE payment.payment_transactions ADD COLUMN IF NOT EXISTS tutor_share_kobo BIGINT DEFAULT 0;
ALTER TABLE payment.payment_transactions ADD COLUMN IF NOT EXISTS platform_share_kobo BIGINT DEFAULT 0;
ALTER TABLE payment.payment_transactions ADD COLUMN IF NOT EXISTS escrow_released_at TIMESTAMP;

-- 1B. Payment reference and status for tutoring.bookings
ALTER TABLE tutoring.bookings ADD COLUMN IF NOT EXISTS payment_reference VARCHAR(100);
ALTER TABLE tutoring.bookings ADD COLUMN IF NOT EXISTS payment_verified BOOLEAN DEFAULT FALSE;

-- 7A. Tutor payouts table
CREATE TABLE IF NOT EXISTS tutoring.tutor_payouts (
    payout_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tutor_id VARCHAR(100) NOT NULL,
    period_label VARCHAR(50) NOT NULL,
    amount_paid NUMERIC(12,2) NOT NULL DEFAULT 0,
    session_count INT NOT NULL DEFAULT 0,
    paid_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 8A. Fix booking_status_check constraint for tutoring.booking
ALTER TABLE tutoring.booking DROP CONSTRAINT IF EXISTS booking_status_check;
ALTER TABLE tutoring.booking ADD CONSTRAINT booking_status_check CHECK (status IN ('PENDING_PAYMENT', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'REQUESTED'));

