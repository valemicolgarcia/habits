-- ============================================
-- MIGRACIÓN: Agregar soporte para tiempo en ejercicios
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Agregar columna measurement_type a routine_exercises
ALTER TABLE routine_exercises 
ADD COLUMN IF NOT EXISTS measurement_type TEXT DEFAULT 'reps' CHECK (measurement_type IN ('reps', 'time'));

-- Agregar columna target_time_seconds a routine_exercises (para cuando es tiempo)
ALTER TABLE routine_exercises 
ADD COLUMN IF NOT EXISTS target_time_seconds INTEGER CHECK (target_time_seconds >= 0);

-- Agregar columna time_seconds a strength_logs (para guardar tiempo cuando corresponde)
ALTER TABLE strength_logs 
ADD COLUMN IF NOT EXISTS time_seconds INTEGER CHECK (time_seconds >= 0);

-- Actualizar ejercicios existentes para que usen reps por defecto
UPDATE routine_exercises 
SET measurement_type = 'reps' 
WHERE measurement_type IS NULL;
