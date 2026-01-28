-- ============================================
-- ESQUEMA DE BASE DE DATOS PARA GYM TRACKER
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Tabla: workout_sessions
-- Almacena cada sesión de entrenamiento por usuario y fecha
CREATE TABLE IF NOT EXISTS workout_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  routine_day TEXT NOT NULL CHECK (routine_day IN ('tren-inferior-a', 'tren-superior-a', 'tren-inferior-b', 'tren-superior-b', 'descanso')),
  completed BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date)
);

-- Tabla: exercise_logs
-- Almacena los ejercicios realizados en cada sesión
CREATE TABLE IF NOT EXISTS exercise_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Tabla: set_logs
-- Almacena cada serie (peso y repeticiones) de cada ejercicio
CREATE TABLE IF NOT EXISTS set_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  exercise_log_id UUID NOT NULL REFERENCES exercise_logs(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL CHECK (set_number > 0),
  weight DECIMAL(5,2) NOT NULL CHECK (weight >= 0),
  reps INTEGER NOT NULL CHECK (reps >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_workout_sessions_user_date ON workout_sessions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_session ON exercise_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_set_logs_exercise ON set_logs(exercise_log_id);
CREATE INDEX IF NOT EXISTS idx_exercise_logs_name ON exercise_logs(exercise_name);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Activar RLS en todas las tablas
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercise_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE set_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para workout_sessions
-- Los usuarios solo pueden ver sus propias sesiones
CREATE POLICY "Users can view own workout sessions"
  ON workout_sessions FOR SELECT
  USING (auth.uid() = user_id);

-- Los usuarios solo pueden insertar sus propias sesiones
CREATE POLICY "Users can insert own workout sessions"
  ON workout_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios solo pueden actualizar sus propias sesiones
CREATE POLICY "Users can update own workout sessions"
  ON workout_sessions FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Los usuarios solo pueden eliminar sus propias sesiones
CREATE POLICY "Users can delete own workout sessions"
  ON workout_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- Políticas para exercise_logs
-- Los usuarios solo pueden ver ejercicios de sus propias sesiones
CREATE POLICY "Users can view own exercise logs"
  ON exercise_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Los usuarios solo pueden insertar ejercicios en sus propias sesiones
CREATE POLICY "Users can insert own exercise logs"
  ON exercise_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Los usuarios solo pueden actualizar ejercicios de sus propias sesiones
CREATE POLICY "Users can update own exercise logs"
  ON exercise_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Los usuarios solo pueden eliminar ejercicios de sus propias sesiones
CREATE POLICY "Users can delete own exercise logs"
  ON exercise_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_logs.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Políticas para set_logs
-- Los usuarios solo pueden ver series de sus propios ejercicios
CREATE POLICY "Users can view own set logs"
  ON set_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM exercise_logs
      JOIN workout_sessions ON workout_sessions.id = exercise_logs.session_id
      WHERE exercise_logs.id = set_logs.exercise_log_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Los usuarios solo pueden insertar series en sus propios ejercicios
CREATE POLICY "Users can insert own set logs"
  ON set_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exercise_logs
      JOIN workout_sessions ON workout_sessions.id = exercise_logs.session_id
      WHERE exercise_logs.id = set_logs.exercise_log_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Los usuarios solo pueden actualizar series de sus propios ejercicios
CREATE POLICY "Users can update own set logs"
  ON set_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM exercise_logs
      JOIN workout_sessions ON workout_sessions.id = exercise_logs.session_id
      WHERE exercise_logs.id = set_logs.exercise_log_id
      AND workout_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM exercise_logs
      JOIN workout_sessions ON workout_sessions.id = exercise_logs.session_id
      WHERE exercise_logs.id = set_logs.exercise_log_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Los usuarios solo pueden eliminar series de sus propios ejercicios
CREATE POLICY "Users can delete own set logs"
  ON set_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM exercise_logs
      JOIN workout_sessions ON workout_sessions.id = exercise_logs.session_id
      WHERE exercise_logs.id = set_logs.exercise_log_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- ============================================
-- FUNCIONES AUXILIARES (OPCIONAL)
-- ============================================

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at en workout_sessions
CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
