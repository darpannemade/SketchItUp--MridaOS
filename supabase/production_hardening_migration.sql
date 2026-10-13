-- ==============================================================================
-- MridaOS Production Hardening Migration (Safe & Idempotent)
-- DB-01: Add critical indexes for query performance
-- DB-02: Add stock_qty >= 0 constraint to prevent negative inventory
-- SEC-03: Add rate_limit_counters table for Supabase-based rate limiting
-- INT-03: Add automatic balance tracking for Khata credit sales
--
-- Run this in Supabase Dashboard → SQL Editor
-- ==============================================================================

-- ────────────────────────────────────────────────────────────────────────────
-- 0. Ensure multi-tenant branch columns exist across all core tables
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE IF EXISTS public.sales 
  ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'nashik-central';

ALTER TABLE IF EXISTS public.inventory 
  ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'nashik-central';

ALTER TABLE IF EXISTS public.khata_ledger 
  ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'nashik-central';

ALTER TABLE IF EXISTS public.activity_logs 
  ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'nashik-central';

ALTER TABLE IF EXISTS public.purchase_orders 
  ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'nashik-central';

ALTER TABLE IF EXISTS public.compliance_licenses 
  ADD COLUMN IF NOT EXISTS branch_id TEXT DEFAULT 'nashik-central';

-- Ensure public.customers table exists (linked to Khata/farmer registry)
CREATE TABLE IF NOT EXISTS public.customers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  phone TEXT,
  branch_id TEXT DEFAULT 'nashik-central',
  village TEXT,
  gstin TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

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
DROP POLICY IF EXISTS "Service role only" ON public.rate_limit_counters;
CREATE POLICY "Service role only" ON public.rate_limit_counters
  USING (auth.role() = 'service_role');


-- ────────────────────────────────────────────────────────────────────────────
-- DB-01: Performance Indexes
-- ────────────────────────────────────────────────────────────────────────────

-- Sales table — queries by branch + date
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

CREATE INDEX IF NOT EXISTS idx_khata_phone
  ON public.khata_ledger(phone);

CREATE INDEX IF NOT EXISTS idx_khata_status
  ON public.khata_ledger(status) WHERE status IN ('due_soon', 'overdue', 'blocked');

-- Customers table — phone lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone
  ON public.customers(phone);

CREATE INDEX IF NOT EXISTS idx_customers_branch
  ON public.customers(branch_id);

-- Activity logs — recency queries for dashboard feed
CREATE INDEX IF NOT EXISTS idx_activity_branch_time
  ON public.activity_logs(branch_id, created_at DESC);

-- Purchase orders — status workflow queries
CREATE INDEX IF NOT EXISTS idx_po_branch_status
  ON public.purchase_orders(branch_id, status);

CREATE INDEX IF NOT EXISTS idx_po_order_date
  ON public.purchase_orders(order_date DESC);

-- Compliance — expiry alert queries
CREATE INDEX IF NOT EXISTS idx_compliance_expiry
  ON public.compliance_licenses(expiry_date ASC) WHERE status != 'expired';


-- ────────────────────────────────────────────────────────────────────────────
-- DB-02: Stock quantity non-negative constraint
-- Prevents bugs or race conditions from storing negative stock
-- ────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
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
-- INT-03: Auto-update Khata ledger balance on credit sales
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_khata_sale_balance()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_khata = TRUE AND NEW.khata_amount > 0 THEN
    UPDATE public.khata_ledger
    SET 
      outstanding_balance = outstanding_balance + NEW.khata_amount,
      total_purchased = total_purchased + NEW.total
    WHERE (NEW.customer_phone IS NOT NULL AND phone = NEW.customer_phone)
       OR name = NEW.customer_name;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_khata_sale_balance ON public.sales;
CREATE TRIGGER trg_khata_sale_balance
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_khata_sale_balance();


-- ────────────────────────────────────────────────────────────────────────────
-- Confirm all indexes created
-- ────────────────────────────────────────────────────────────────────────────
SELECT indexname, tablename
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;
