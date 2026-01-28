-- ============================================
-- MIGRACIÓN: Agregar ritmo cardíaco a running_logs
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Agregar columnas de ritmo cardíaco a running_logs
ALTER TABLE running_logs 
ADD COLUMN IF NOT EXISTS heart_rate_min INTEGER CHECK (heart_rate_min >= 0);

ALTER TABLE running_logs 
ADD COLUMN IF NOT EXISTS heart_rate_max INTEGER CHECK (heart_rate_max >= 0);
