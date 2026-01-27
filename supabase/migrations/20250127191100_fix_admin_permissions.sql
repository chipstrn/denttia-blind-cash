-- Migration: Fix Admin Permissions and Ensure Column Exists
-- Created at: 2025-01-27

-- 1. Ensure the 'is_general_fund' column exists (Action Idempotent)
ALTER TABLE expenses 
ADD COLUMN IF NOT EXISTS is_general_fund BOOLEAN DEFAULT FALSE;

-- 2. Create Policy to allow Authenticated Users (Admins) to UPDATE expenses
-- Note: Existing policies might only allow "Owner" to update.
-- We want to allow any authenticated user (like the Admin) to update any expense.
-- If a policy with this name already exists, we drop it first to avoid conflicts.

DROP POLICY IF EXISTS "Allow authenticated users to update expenses" ON expenses;

CREATE POLICY "Allow authenticated users to update expenses"
ON expenses
FOR UPDATE
USING (auth.role() = 'authenticated')
WITH CHECK (auth.role() = 'authenticated');

-- 3. (Optional) Allow DELETE for authenticated users too, in case Admin needs to delete
DROP POLICY IF EXISTS "Allow authenticated users to delete expenses" ON expenses;

CREATE POLICY "Allow authenticated users to delete expenses"
ON expenses
FOR DELETE
USING (auth.role() = 'authenticated');
