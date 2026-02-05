-- ============================================
-- MIGRACIÓN: MLOps correcciones human-in-the-loop
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase.
--
-- Después, en Supabase Dashboard > Storage:
-- 1. Crea un bucket llamado "mlops-corrections" (privado recomendado).
-- 2. El backend nutri-ai usa SUPABASE_SERVICE_ROLE_KEY para subir imágenes.
-- ============================================

-- Tabla: ingredient_corrections
-- Guarda correcciones de usuarios (imagen en Storage + anotaciones en JSONB)
CREATE TABLE IF NOT EXISTS ingredient_corrections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  image_id UUID NOT NULL UNIQUE,
  image_path TEXT NOT NULL,
  detected_ingredients JSONB NOT NULL DEFAULT '[]',
  corrected_ingredients JSONB NOT NULL DEFAULT '[]',
  consent BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_ingredient_corrections_created_at ON ingredient_corrections(created_at);

-- RLS: solo el backend (service_role) escribe; anon no tiene acceso.
ALTER TABLE ingredient_corrections ENABLE ROW LEVEL SECURITY;

-- Sin políticas para anon: solo service_role (backend) puede INSERT/SELECT.
-- Si quisieras que usuarios autenticados lean sus correcciones, añade políticas aquí.
