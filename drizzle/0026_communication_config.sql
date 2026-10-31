-- 0026 — إعدادات التواصل والمشاركة (واتساب / إيميل) للطلبات والتقارير.
-- عمود JSON text في جدول settings يخزّن CommunicationSettings المشترك.
-- Idempotent (IF NOT EXISTS) بلا DROP/TRUNCATE.

--> statement-breakpoint
ALTER TABLE "settings" ADD COLUMN IF NOT EXISTS "communicationConfig" text;