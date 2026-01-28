-- ============================================
-- MIGRACIÓN: Tabla day_habits para guardar hábitos diarios
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Tabla: day_habits
-- Guarda los hábitos diarios del usuario (movimiento, estudio, lectura, nutrición, hábitos personalizados)
CREATE TABLE IF NOT EXISTS day_habits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  movimiento BOOLEAN DEFAULT false,
  movimiento_rutina_completada BOOLEAN DEFAULT false,
  estudio BOOLEAN DEFAULT false,
  lectura BOOLEAN DEFAULT false,
  nutricion JSONB DEFAULT '[]'::jsonb, -- Array de objetos {meal: string, score: number}
  nutricion_permitido BOOLEAN DEFAULT false,
  custom_habits JSONB DEFAULT '{}'::jsonb, -- Objeto {habitId: boolean}
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Tabla: custom_habit_definitions
-- Guarda las definiciones de hábitos personalizados del usuario
CREATE TABLE IF NOT EXISTS custom_habit_definitions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  habit_id TEXT NOT NULL, -- ID único del hábito (ej: custom-1234567890-abc123)
  name TEXT NOT NULL,
  emoji TEXT,
  color TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, habit_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_day_habits_user_date ON day_habits(user_id, date);
CREATE INDEX IF NOT EXISTS idx_custom_habit_definitions_user ON custom_habit_definitions(user_id);

-- Activar RLS
ALTER TABLE day_habits ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_habit_definitions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS - day_habits
-- ============================================

CREATE POLICY "Users can view own day habits"
  ON day_habits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own day habits"
  ON day_habits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own day habits"
  ON day_habits FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own day habits"
  ON day_habits FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS - custom_habit_definitions
-- ============================================

CREATE POLICY "Users can view own custom habit definitions"
  ON custom_habit_definitions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own custom habit definitions"
  ON custom_habit_definitions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own custom habit definitions"
  ON custom_habit_definitions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own custom habit definitions"
  ON custom_habit_definitions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRIGGER para updated_at
-- ============================================

CREATE TRIGGER update_day_habits_updated_at
  BEFORE UPDATE ON day_habits
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
