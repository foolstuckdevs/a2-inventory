-- A2 Inventory Management System - Supabase SQL Schema
-- Run this in Supabase SQL Editor

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================
-- TABLES
-- ============================================

-- Profiles (linked to Supabase Auth)
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name VARCHAR(150) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'employee' CHECK (role IN ('admin', 'employee')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Categories
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Items
CREATE TABLE items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(150) NOT NULL,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  type VARCHAR(20) NOT NULL CHECK (type IN ('consumable', 'non_consumable')),
  quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reorder_level INTEGER NOT NULL DEFAULT 5,
  unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'damaged', 'lost', 'disposed')),
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Transactions
CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES items(id) ON DELETE CASCADE,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action VARCHAR(20) NOT NULL CHECK (action IN ('stock_in', 'stock_out', 'borrowed', 'returned', 'damaged', 'lost', 'disposed', 'stock_return')),
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  item_id UUID REFERENCES items(id) ON DELETE SET NULL,
  title VARCHAR(150) NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ
);

-- Audit log for hard-deleted items
CREATE TABLE item_deletion_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL,
  item_name VARCHAR(150) NOT NULL,
  deleted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX idx_items_category ON items(category_id);
CREATE INDEX idx_items_assigned_to ON items(assigned_to);
CREATE INDEX idx_items_status ON items(status);
CREATE INDEX idx_transactions_item ON transactions(item_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_created ON transactions(created_at DESC);
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_unread ON notifications(user_id, read_at);
CREATE INDEX idx_item_deletion_logs_created ON item_deletion_logs(created_at DESC);

-- ============================================
-- AUTO-UPDATE updated_at TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER items_updated_at
  BEFORE UPDATE ON items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- AUTO-CREATE PROFILE ON SIGNUP TRIGGER
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'employee');

  -- Insert profile (skip if already created by admin API)
  INSERT INTO profiles (id, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'User'),
    user_role
  )
  ON CONFLICT (id) DO NOTHING;

  -- Sync role into app_metadata so it appears in the JWT
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', user_role)
  WHERE id = NEW.id;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block auth user creation due to profile sync errors
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Helper function to check admin role from profiles (avoids relying on JWT app_metadata)
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================
-- ATOMIC TRANSACTION FUNCTION
-- ============================================
-- This function atomically inserts a transaction and updates item quantity
-- to prevent race conditions from concurrent operations.
CREATE OR REPLACE FUNCTION create_transaction_atomic(
  p_item_id UUID,
  p_user_id UUID,
  p_action VARCHAR(20),
  p_quantity INTEGER,
  p_remarks TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_transaction_id UUID;
  v_current_qty INTEGER;
  v_new_qty INTEGER;
BEGIN
  -- Lock the item row to prevent concurrent modifications
  SELECT quantity INTO v_current_qty
  FROM items
  WHERE id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item not found';
  END IF;

  -- Validate sufficient stock for outgoing actions
  IF p_action IN ('stock_out', 'borrowed', 'damaged', 'lost', 'disposed') AND v_current_qty < p_quantity THEN
    RAISE EXCEPTION 'Insufficient stock. Available: %, Requested: %', v_current_qty, p_quantity;
  END IF;

  -- Insert the transaction record
  INSERT INTO transactions (item_id, user_id, action, quantity, remarks)
  VALUES (p_item_id, p_user_id, p_action, p_quantity, p_remarks)
  RETURNING id INTO v_transaction_id;

  -- Update item quantity based on action
  IF p_action IN ('stock_in', 'returned', 'stock_return') THEN
    UPDATE items SET quantity = quantity + p_quantity WHERE id = p_item_id;
  ELSIF p_action IN ('stock_out', 'borrowed', 'damaged', 'lost', 'disposed') THEN
    UPDATE items SET quantity = quantity - p_quantity WHERE id = p_item_id;
  END IF;

  -- Auto-set item status when quantity reaches 0 for damage/loss/disposal
  SELECT quantity INTO v_new_qty FROM items WHERE id = p_item_id;
  IF p_action IN ('damaged', 'lost', 'disposed') AND v_new_qty = 0 THEN
    UPDATE items SET status = p_action WHERE id = p_item_id;
  END IF;

  -- Reset status to active when restocking a damaged/lost item
  IF p_action = 'stock_in' THEN
    UPDATE items SET status = 'active' WHERE id = p_item_id AND status IN ('damaged', 'lost');
  END IF;

  -- Auto-set assigned_to on borrow/return (non-consumable only)
  IF p_action = 'borrowed' AND EXISTS (SELECT 1 FROM items WHERE id = p_item_id AND type = 'non_consumable') THEN
    UPDATE items SET assigned_to = p_user_id WHERE id = p_item_id;
  ELSIF p_action = 'returned' THEN
    UPDATE items SET assigned_to = NULL WHERE id = p_item_id;
  END IF;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- ROW LEVEL SECURITY POLICIES
-- ============================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE item_deletion_logs ENABLE ROW LEVEL SECURITY;

-- Profiles: users can view/update own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE USING (auth.uid() = id);

-- Profiles: admins can manage all (uses JWT to avoid self-referencing subquery)
CREATE POLICY "Admins can select all profiles"
  ON profiles FOR SELECT USING (
    is_admin()
    OR auth.uid() = id
  );

CREATE POLICY "Admins can insert profiles"
  ON profiles FOR INSERT WITH CHECK (
    is_admin()
  );

CREATE POLICY "Admins can update all profiles"
  ON profiles FOR UPDATE USING (
    is_admin()
  );

CREATE POLICY "Admins can delete profiles"
  ON profiles FOR DELETE USING (
    is_admin()
  );

-- Categories: any authenticated user
CREATE POLICY "Authenticated users can manage categories"
  ON categories FOR ALL USING (auth.uid() IS NOT NULL);

-- Items: authenticated users can view and create, admins can update/delete
CREATE POLICY "Authenticated users can view items"
  ON items FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Authenticated users can create items"
  ON items FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can update items"
  ON items FOR UPDATE USING (is_admin());

CREATE POLICY "Admins can delete items"
  ON items FOR DELETE USING (is_admin());

-- Transactions: any authenticated user
CREATE POLICY "Authenticated users can manage transactions"
  ON transactions FOR ALL USING (auth.uid() IS NOT NULL);

-- Notifications: users can only see and update their own notifications
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
  ON notifications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE USING (auth.uid() = user_id);

-- Item deletion logs: admins can view, admins can insert during deletion workflow
CREATE POLICY "Admins can view item deletion logs"
  ON item_deletion_logs FOR SELECT USING (is_admin());

CREATE POLICY "Authenticated users can insert item deletion logs"
  ON item_deletion_logs FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
