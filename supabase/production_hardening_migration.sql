-- ==============================================================================
-- MridaOS Production Hardening Migration
-- DB-01: Add critical indexes for query performance
-- DB-02: Add stock_qty >= 0 constraint to prevent negative inventory
-- SEC-03: Add rate_limit_counters table for Supabase-based rate limiting
--
-- Run this in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- SEC-03: Rate limit counters table (replaces Redis dependency)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.rate_limit_counters (
  key             TEXT PRIMARY KEY,
  count           INTEGER DEFAULT 1 NOT NULL,
  window_start    TIMESTAMPTZ DEFAULT now() NOT NULL,
  window_seconds  INTEGER NOT NULL
);

-- Only service_role can modify rate limit counters
ALTER TABLE public.rate_limit_counters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role only" ON public.rate_limit_counters
  USING (auth.role() = 'service_role');

-- Auto-cleanup expired counters older than 1 hour (optional, keeps table lean)
-- You can run this periodically via pg_cron or a scheduled edge function
-- DELETE FROM public.rate_limit_counters
--   WHERE window_start < now() - interval '1 hour';


-- ────────────────────────────────────────────────────────────────────────────
-- DB-01: Performance Indexes (zero indexes existed before this migration)
-- ────────────────────────────────────────────────────────────────────────────

-- Sales table — most frequent queries are by branch + date
CREATE INDEX IF NOT EXISTS idx_sales_branch_date
  ON public.sales(branch_id, date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_date
  ON public.sales(date DESC);

CREATE INDEX IF NOT EXISTS idx_sales_invoice_no
  ON public.sales(invoice_no);

CREATE INDEX IF NOT EXISTS idx_sales_customer_name
  ON public.sales(customer_name);

CREATE INDEX IF NOT EXISTS idx_sales_is_khata
  ON public.sales(is_khata) WHERE is_khata = TRUE;

-- Inventory table — SKU lookups and low-stock queries
CREATE INDEX IF NOT EXISTS idx_inventory_sku
  ON public.inventory(sku);

CREATE INDEX IF NOT EXISTS idx_inventory_category
  ON public.inventory(category);

CREATE INDEX IF NOT EXISTS idx_inventory_stock_qty
  ON public.inventory(stock_qty) WHERE stock_qty <= reorder_level;

-- Khata ledger — outstanding balance queries for credit risk dashboard
CREATE INDEX IF NOT EXISTS idx_khata_branch
  ON public.khata_ledger(branch_id, outstanding_balance DESC);

CREATE INDEX IF NOT EXISTS idx_khata_status
  ON public.khata_ledger(status) WHERE status IN ('due_soon', 'overdue', 'blocked');

-- Activity logs — recency queries for dashboard feed
CREATE INDEX IF NOT EXISTS idx_activity_branch_time
  ON public.activity_logs(branch_id, created_at DESC);

-- Purchase orders — status workflow queries
CREATE INDEX IF NOT EXISTS idx_po_branch_status
  ON public.purchase_orders(branch_id, status);

CREATE INDEX IF NOT EXISTS idx_po_order_date
  ON public.purchase_orders(order_date DESC);

-- Customers — phone lookups for billing terminal search
CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON public.customers(phone);

CREATE INDEX IF NOT EXISTS idx_customers_branch
  ON public.customers(branch_id);

-- Compliance — expiry alert queries
CREATE INDEX IF NOT EXISTS idx_compliance_expiry
  ON public.compliance_licenses(expiry_date ASC) WHERE status != 'expired';


-- ────────────────────────────────────────────────────────────────────────────
-- DB-02: Stock quantity non-negative constraint
-- Prevents bugs or race conditions from storing negative stock
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  -- Only add constraint if it doesn't already exist
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_stock_non_negative'
    AND conrelid = 'public.inventory'::regclass
  ) THEN
    ALTER TABLE public.inventory
      ADD CONSTRAINT chk_stock_non_negative
      CHECK (stock_qty >= 0);
  END IF;
END $$;


-- ────────────────────────────────────────────────────────────────────────────
-- DB-04 (partial): Add ON DELETE RESTRICT to sales.branch_id if not present
-- Prevents orphaned sales records if a branch is deleted
-- ────────────────────────────────────────────────────────────────────────────
-- Note: If your FK was created without ON DELETE RESTRICT, you need to
-- recreate it. Check first with:
--   SELECT conname, confdeltype FROM pg_constraint WHERE conname LIKE '%branch%';
-- If confdeltype = 'a' (NO ACTION) it already restricts. No action needed.


-- ────────────────────────────────────────────────────────────────────────────
-- Confirm all indexes created
-- ────────────────────────────────────────────────────────────────────────────
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
