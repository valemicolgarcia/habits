-- ============================================
-- MIGRACIÓN: Agregar tabla para notas de ejercicio
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
-- ============================================

-- Tabla: exercise_notes
-- Notas por ejercicio en cada sesión
CREATE TABLE IF NOT EXISTS exercise_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  block_id UUID NOT NULL REFERENCES routine_blocks(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(session_id, block_id, exercise_name)
);

-- Índice para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS idx_exercise_notes_session ON exercise_notes(session_id);
CREATE INDEX IF NOT EXISTS idx_exercise_notes_block ON exercise_notes(block_id);

-- Activar RLS
ALTER TABLE exercise_notes ENABLE ROW LEVEL SECURITY;

-- Política RLS: Los usuarios solo pueden ver sus propias notas
CREATE POLICY "Users can view own exercise notes"
  ON exercise_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_notes.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Política RLS: Los usuarios solo pueden insertar sus propias notas
CREATE POLICY "Users can insert own exercise notes"
  ON exercise_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_notes.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Política RLS: Los usuarios solo pueden actualizar sus propias notas
CREATE POLICY "Users can update own exercise notes"
  ON exercise_notes FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_notes.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_notes.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Política RLS: Los usuarios solo pueden eliminar sus propias notas
CREATE POLICY "Users can delete own exercise notes"
  ON exercise_notes FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM workout_sessions
      WHERE workout_sessions.id = exercise_notes.session_id
      AND workout_sessions.user_id = auth.uid()
    )
  );

-- Trigger para actualizar updated_at automáticamente
CREATE TRIGGER update_exercise_notes_updated_at
  BEFORE UPDATE ON exercise_notes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
