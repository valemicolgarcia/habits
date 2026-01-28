-- ============================================
-- MIGRACIÓN: Agregar notas a routine_blocks
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Agregar columna notes a routine_blocks
ALTER TABLE routine_blocks 
ADD COLUMN IF NOT EXISTS notes TEXT;
