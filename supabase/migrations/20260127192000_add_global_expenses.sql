-- Add is_global column to expenses table
ALTER TABLE expenses ADD COLUMN is_global BOOLEAN DEFAULT FALSE;
