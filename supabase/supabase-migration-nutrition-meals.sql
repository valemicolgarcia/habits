-- ============================================
-- MIGRACIÓN: Comidas con fotos e ingredientes (Nutri AI)
-- ============================================
-- Ejecuta este script en el SQL Editor de Supabase
--
-- Después, en Supabase Dashboard > Storage:
-- 1. Crea un bucket llamado "meal-images" (público para leer imágenes, o privado con políticas)
-- 2. Si es público: permite "Public bucket" para que las URLs de getPublicUrl funcionen
-- 3. Políticas sugeridas (si el bucket es privado):
--    - INSERT: (bucket_id = 'meal-images' AND (storage.foldername(name))[1] = auth.uid()::text)
--    - SELECT: (bucket_id = 'meal-images' AND (storage.foldername(name))[1] = auth.uid()::text)
-- ============================================

-- Tabla: meals
-- Registro de cada comida (desayuno/almuerzo/merienda/cena) con foto, salud y puntuación
CREATE TABLE IF NOT EXISTS meals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  meal_type TEXT NOT NULL CHECK (meal_type IN ('desayuno', 'almuerzo', 'merienda', 'cena')),
  image_url TEXT, -- URL de la imagen segmentada en Storage (bucket meal-images)
  health_level INTEGER NOT NULL CHECK (health_level IN (0, 1, 2)), -- 0=Mal, 1=Regular, 2=Sano
  star_rating INTEGER CHECK (star_rating >= 1 AND star_rating <= 5), -- 1-5 estrellas (cómo le cayó)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, date, meal_type)
);

-- Tabla: meal_ingredients
-- Ingredientes detectados o añadidos por el usuario para cada comida
CREATE TABLE IF NOT EXISTS meal_ingredients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meal_id UUID NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
  ingredient_name TEXT NOT NULL,
  confirmed BOOLEAN NOT NULL DEFAULT true, -- true = sí lo comió, false = no
  added_manually BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_meals_user_date ON meals(user_id, date);
CREATE INDEX IF NOT EXISTS idx_meal_ingredients_meal ON meal_ingredients(meal_id);

-- RLS
ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
ALTER TABLE meal_ingredients ENABLE ROW LEVEL SECURITY;

-- Políticas meals
CREATE POLICY "Users can view own meals"
  ON meals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own meals"
  ON meals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meals"
  ON meals FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own meals"
  ON meals FOR DELETE USING (auth.uid() = user_id);

-- Políticas meal_ingredients
CREATE POLICY "Users can view own meal ingredients"
  ON meal_ingredients FOR SELECT
  USING (EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_ingredients.meal_id AND meals.user_id = auth.uid()));
CREATE POLICY "Users can insert own meal ingredients"
  ON meal_ingredients FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_ingredients.meal_id AND meals.user_id = auth.uid()));
CREATE POLICY "Users can update own meal ingredients"
  ON meal_ingredients FOR UPDATE
  USING (EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_ingredients.meal_id AND meals.user_id = auth.uid()));
CREATE POLICY "Users can delete own meal ingredients"
  ON meal_ingredients FOR DELETE
  USING (EXISTS (SELECT 1 FROM meals WHERE meals.id = meal_ingredients.meal_id AND meals.user_id = auth.uid()));

-- Trigger updated_at
CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
