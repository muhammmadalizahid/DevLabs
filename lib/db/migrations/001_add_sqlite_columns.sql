-- Migration: Add SQLite sandbox columns to datasets table
-- Date: May 7, 2026
-- Run this in Supabase SQL Editor if you already have the datasets table

-- Add storage_path column (path to CSV in Supabase Storage)
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add table_name column (name of primary table)
ALTER TABLE datasets ADD COLUMN IF NOT EXISTS table_name TEXT;

-- Verify migration
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'datasets' 
ORDER BY ordinal_position;
