-- ============================================
-- ESQUEMA DE BASE DE DATOS V2 - GYM TRACKER
-- Rutina Semanal Personalizada por Usuario
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- IMPORTANTE: Este script reemplaza el esquema anterior
-- ============================================

-- Eliminar tablas antiguas si existen (opcional, comentar si quieres conservar datos)
-- DROP TABLE IF EXISTS set_logs CASCADE;
-- DROP TABLE IF EXISTS exercise_logs CASCADE;
-- DROP TABLE IF EXISTS workout_sessions CASCADE;

-- ============================================
-- TABLAS PRINCIPALES
-- ============================================

-- Tabla: user_profiles
-- Perfil básico del usuario
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: weekly_routines
-- Configuración de rutina semanal (lunes a domingo, 0-6)
CREATE TABLE IF NOT EXISTS weekly_routines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  type TEXT NOT NULL CHECK (type IN ('musculacion', 'running', 'aerobico', 'descanso')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, day_of_week)
);

-- Tabla: routine_blocks
-- Bloques de ejercicios para días de musculación
CREATE TABLE IF NOT EXISTS routine_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  routine_day_id UUID NOT NULL REFERENCES weekly_routines(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  rest_seconds INTEGER NOT NULL DEFAULT 60 CHECK (rest_seconds >= 0),
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: routine_exercises
-- Ejercicios dentro de cada bloque
CREATE TABLE IF NOT EXISTS routine_exercises (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  block_id UUID NOT NULL REFERENCES routine_blocks(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_sets INTEGER NOT NULL CHECK (target_sets > 0),
  target_reps TEXT NOT NULL,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: workout_sessions
-- Sesiones de entrenamiento ejecutadas
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('musculacion', 'running', 'aerobico', 'descanso')),
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Tabla: strength_logs
-- Logs de ejercicios de musculación (peso y repeticiones)
CREATE TABLE IF NOT EXISTS strength_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES routine_blocks(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  set_number INTEGER NOT NULL CHECK (set_number > 0),
  weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0),
  reps INTEGER NOT NULL CHECK (reps >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: running_logs
-- Logs de sesiones de running
CREATE TABLE IF NOT EXISTS running_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE UNIQUE,
  km DECIMAL(5,2) NOT NULL CHECK (km >= 0),
  time_minutes INTEGER NOT NULL CHECK (time_minutes >= 0),
  calories INTEGER CHECK (calories >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: aerobic_logs
-- Logs de sesiones aeróbicas
CREATE TABLE IF NOT EXISTS aerobic_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE UNIQUE,
  exercise TEXT NOT NULL,
  time_minutes INTEGER NOT NULL CHECK (time_minutes >= 0),
  calories INTEGER CHECK (calories >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ============================================
-- ÍNDICES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_user_profiles_user_id ON user_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_routines_user_day ON weekly_routines(user_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_routine_blocks_routine_day ON routine_blocks(routine_day_id);
CREATE INDEX IF NOT EXISTS idx_routine_exercises_block ON routine_exercises(block_id);
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_strength_logs_session ON strength_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_strength_logs_block ON strength_logs(block_id);
CREATE INDEX IF NOT EXISTS idx_running_logs_session ON running_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_aerobic_logs_session ON aerobic_logs(session_id);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activar RLS en todas las tablas
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_routines ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE routine_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE strength_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE running_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE aerobic_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS RLS - user_profiles
-- ============================================

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile"
  ON user_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS - weekly_routines
-- ============================================

CREATE POLICY "Users can view own weekly routines"
  ON weekly_routines FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own weekly routines"
  ON weekly_routines FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own weekly routines"
  ON weekly_routines FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own weekly routines"
  ON weekly_routines FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS - routine_blocks
-- ============================================

CREATE POLICY "Users can view own routine blocks"
  ON routine_blocks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM weekly_routines
      WHERE weekly_routines.id = routine_blocks.routine_day_id
      AND weekly_routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own routine blocks"
  ON routine_blocks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_routines
      WHERE weekly_routines.id = routine_blocks.routine_day_id
      AND weekly_routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own routine blocks"
  ON routine_blocks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_routines
      WHERE weekly_routines.id = routine_blocks.routine_day_id
      AND weekly_routines.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM weekly_routines
      WHERE weekly_routines.id = routine_blocks.routine_day_id
      AND weekly_routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own routine blocks"
  ON routine_blocks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM weekly_routines
      WHERE weekly_routines.id = routine_blocks.routine_day_id
      AND weekly_routines.user_id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS RLS - routine_exercises
-- ============================================

CREATE POLICY "Users can view own routine exercises"
  ON routine_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM routine_blocks
      JOIN weekly_routines ON weekly_routines.id = routine_blocks.routine_day_id
      WHERE routine_blocks.id = routine_exercises.block_id
      AND weekly_routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own routine exercises"
  ON routine_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routine_blocks
      JOIN weekly_routines ON weekly_routines.id = routine_blocks.routine_day_id
      WHERE routine_blocks.id = routine_exercises.block_id
      AND weekly_routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own routine exercises"
  ON routine_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM routine_blocks
      JOIN weekly_routines ON weekly_routines.id = routine_blocks.routine_day_id
      WHERE routine_blocks.id = routine_exercises.block_id
      AND weekly_routines.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM routine_blocks
      JOIN weekly_routines ON weekly_routines.id = routine_blocks.routine_day_id
      WHERE routine_blocks.id = routine_exercises.block_id
      AND weekly_routines.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own routine exercises"
  ON routine_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM routine_blocks
      JOIN weekly_routines ON weekly_routines.id = routine_blocks.routine_day_id
      WHERE routine_blocks.id = routine_exercises.block_id
      AND weekly_routines.user_id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS RLS - workout_sessions
-- ============================================

CREATE POLICY "Users can view own workout sessions"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own workout sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own workout sessions"
  ON workout_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own workout sessions"
  ON workout_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- POLÍTICAS RLS - strength_logs
-- ============================================

CREATE POLICY "Users can view own strength logs"
  ON strength_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = strength_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own strength logs"
  ON strength_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = strength_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own strength logs"
  ON strength_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = strength_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = strength_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own strength logs"
  ON strength_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = strength_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS RLS - running_logs
-- ============================================

CREATE POLICY "Users can view own running logs"
  ON running_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = running_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own running logs"
  ON running_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = running_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own running logs"
  ON running_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = running_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = running_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own running logs"
  ON running_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = running_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- POLÍTICAS RLS - aerobic_logs
-- ============================================

CREATE POLICY "Users can view own aerobic logs"
  ON aerobic_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = aerobic_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert own aerobic logs"
  ON aerobic_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = aerobic_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own aerobic logs"
  ON aerobic_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = aerobic_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = aerobic_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own aerobic logs"
  ON aerobic_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = aerobic_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at
CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_weekly_routines_updated_at
  BEFORE UPDATE ON weekly_routines
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
