# Arquitectura y Estructura del Proyecto Gym Tracker

## 1. Visión general

Gym Tracker es una aplicación web de seguimiento de entrenamiento y hábitos. Stack:
- **Frontend**: React 18 + TypeScript + Vite
- **Backend**: Supabase (PostgreSQL + Auth + API)
- **Estilos**: TailwindCSS + PostCSS
- **Arquitectura**: SPA (Single Page Application) con estado global mediante Context API

---

## 2. Arquitectura de capas

### 2.1. Capa de presentación (UI)

**Ubicación:** `src/components/`

**Componentes principales:**
- `App.tsx`: Componente raíz que decide mostrar `Auth` o `MainDashboard` según la sesión.
- `MainDashboard.tsx`: Dashboard principal con sidebar, navegación por secciones y gestión de hábitos del día.
- `Auth.tsx`: Login/registro con Supabase Auth.
- `UserProfile.tsx`: Vista y edición del perfil (nombre, imagen).

**Secciones funcionales:**
- **Movimiento:** `MovementSection.tsx`, `WorkoutDayV2.tsx`, `StrengthWorkout.tsx`, `RunningWorkout.tsx`, `AerobicWorkout.tsx`
- **Nutrición:** `NutritionPage.tsx`, `NutritionSection.tsx`
- **Hábitos:** `HabitGrid.tsx`, `HabitsGrid.tsx`
- **Estudio/Lectura:** `StudyPage.tsx`, `StudySection.tsx`, `ReadingPage.tsx`, `ReadingSection.tsx`
- **Configuración:** `Profile.tsx`, `MuscleDayConfig.tsx`

**Principio:** Los componentes se enfocan en la UI y delegan la lógica a hooks y contextos.

---

### 2.2. Capa de estado global (Context API)

**Ubicación:** `src/contexts/`

**`HabitsContext.tsx`:**
- Estado global de hábitos diarios (movimiento, estudio, lectura, nutrición, hábitos personalizados).
- Funciones para actualizar hábitos y sincronizar con Supabase.
- Carga inicial desde Supabase y backup en `localStorage`.
- Funciones de cálculo: `getNutritionScore()`, `getNutritionColor()`.

**`UserProfileContext.tsx`:**
- Estado global del perfil (nombre, imagen).
- Funciones para actualizar perfil y sincronizar con Supabase.

**Patrón:** Provider envuelve la app en `App.tsx` para inyectar el contexto en toda la jerarquía.

---

### 2.3. Capa de lógica de negocio (Custom Hooks)

**Ubicación:** `src/hooks/`

**Hooks principales:**

| Hook | Responsabilidad |
|------|-----------------|
| `useAuth.ts` | Autenticación con Supabase Auth (`signIn`, `signUp`, `signOut`, sesión). |
| `useTheme.ts` | Tema claro/oscuro y persistencia en `localStorage`. |
| `useWeeklyRoutine.ts` | Rutina semanal (7 días): cargar, guardar, `getRoutineForDay()`, `isComplete()`. |
| `useRoutineBlocks.ts` | Bloques y ejercicios de un día de musculación. |
| `useWorkoutSessionV2.ts` | Sesión de entrenamiento del día: guardar/cargar strength, running, aeróbico. |
| `usePreviousWeekData.ts` | Datos de la semana anterior para comparar progreso. |
| `useExerciseHistory.ts` | Historial de un ejercicio específico. |
| `useWorkoutSession.ts` | Versión legacy de sesión de entrenamiento. |

**Principio:** Cada hook encapsula una responsabilidad y abstrae la comunicación con Supabase.

---

### 2.4. Capa de servicios (Cliente de Supabase)

**Ubicación:** `src/lib/supabase.ts`

**Función:**
- Crea el cliente de Supabase con `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`.
- Re-exporta tipos TypeScript desde `types.ts`.
- Único punto de acceso a Supabase en la app.

**Uso:**
```typescript
import { supabase } from '../lib/supabase'
// Luego: supabase.from('tabla').select()...
```

---

### 2.5. Capa de tipos y utilidades

**Ubicación:** `src/lib/`

| Archivo | Función |
|---------|---------|
| `types.ts` | Tipos TypeScript del dominio: `DayType`, `DayOfWeek`, `UserProfile`, `WeeklyRoutine`, `RoutineBlock`, `RoutineExercise`, `WorkoutSession`, `StrengthLog`, `RunningLog`, `AerobicLog`, etc. |
| `utils.ts` | Utilidades: `formatDate()`, `getDayOfWeek()`, `getDayName()`. |
| `routine.ts` | Helpers relacionados con rutinas (usado por componentes legacy). |

---

## 3. Flujo de datos

### 3.1. Autenticación

1. `App.tsx` usa `useAuth()`.
2. `useAuth()` verifica sesión con `supabase.auth.getSession()`.
3. Si hay sesión → muestra `MainDashboard` (envuelto en Providers).
4. Si no hay sesión → muestra `Auth`.
5. `useAuth()` escucha cambios con `onAuthStateChange`.

### 3.2. Carga inicial de datos

1. `App.tsx` envuelve todo en `HabitsProvider` y `UserProfileProvider`.
2. `HabitsContext` usa `useAuth()` para obtener `user`.
3. Si hay `user`, carga desde Supabase (`loadFromSupabase()`).
4. Los datos se guardan en estado React (`habits`, `customHabitDefinitions`).
5. También se guardan en `localStorage` como backup.
6. Los componentes consumen el contexto con `useHabits()`.

### 3.3. Actualización de datos

1. Usuario interactúa (ej: marca hábito).
2. Componente llama función del contexto (ej: `updateEstudio()`).
3. Contexto actualiza estado local (optimistic update).
4. Contexto guarda en Supabase (`supabase.from('day_habits').upsert()`).
5. Contexto guarda en `localStorage` como backup.
6. UI se actualiza automáticamente (React re-render).

### 3.4. Rutina semanal

1. `Profile.tsx` usa `useWeeklyRoutine()`.
2. `useWeeklyRoutine()` carga desde `weekly_routines` al montar.
3. Usuario configura días → `saveRoutine()` guarda en Supabase.
4. `MovementSection.tsx` usa `useWeeklyRoutine()` para saber qué día toca.
5. `WorkoutDayV2.tsx` usa `useRoutineBlocks()` para cargar bloques/ejercicios.

### 3.5. Sesión de entrenamiento

1. `WorkoutDayV2.tsx` usa `useWorkoutSessionV2(date, dayType)`.
2. Carga sesión existente si existe.
3. Usuario completa entrenamiento → `saveStrengthSession()` / `saveRunningSession()` / `saveAerobicSession()`.
4. Hook guarda en `workout_sessions` y logs correspondientes (`strength_logs`, `running_logs`, `aerobic_logs`).
5. `MovementSection.tsx` marca movimiento como completado si la rutina se completó.

---

## 4. Estructura de carpetas

```
gym/
├── index.html              # Punto de entrada HTML (Vite lo usa)
├── package.json            # Dependencias y scripts
├── vite.config.ts          # Configuración de Vite
├── tsconfig.json           # Configuración de TypeScript
├── tailwind.config.js      # Configuración de TailwindCSS
├── postcss.config.js       # PostCSS (Tailwind + autoprefixer)
├── vercel.json             # Configuración de despliegue (Vercel)
├── .env                    # Variables de entorno (NO se sube a Git)
├── env.example.txt         # Plantilla de .env
├── .gitignore              # Archivos ignorados por Git
│
├── public/                 # Assets estáticos (iconos, imágenes)
│
├── src/                    # Código fuente de la aplicación
│   ├── main.tsx            # Punto de entrada React (monta App en #root)
│   ├── App.tsx             # Componente raíz (Auth + Providers + MainDashboard)
│   ├── index.css           # Estilos globales (Tailwind imports)
│   ├── vite-env.d.ts       # Tipos de Vite
│   │
│   ├── components/         # Componentes React (UI)
│   │   ├── Auth.tsx
│   │   ├── MainDashboard.tsx
│   │   ├── UserProfile.tsx
│   │   ├── HabitGrid.tsx
│   │   ├── MovementSection.tsx
│   │   ├── WorkoutDayV2.tsx
│   │   ├── StrengthWorkout.tsx
│   │   ├── RunningWorkout.tsx
│   │   ├── AerobicWorkout.tsx
│   │   ├── NutritionPage.tsx
│   │   ├── NutritionSection.tsx
│   │   ├── StudyPage.tsx
│   │   ├── ReadingPage.tsx
│   │   ├── Profile.tsx
│   │   ├── MuscleDayConfig.tsx
│   │   └── ... (otros componentes)
│   │
│   ├── contexts/           # Context API (estado global)
│   │   ├── HabitsContext.tsx
│   │   └── UserProfileContext.tsx
│   │
│   ├── hooks/              # Custom Hooks (lógica reutilizable)
│   │   ├── useAuth.ts
│   │   ├── useTheme.ts
│   │   ├── useWeeklyRoutine.ts
│   │   ├── useRoutineBlocks.ts
│   │   ├── useWorkoutSessionV2.ts
│   │   ├── usePreviousWeekData.ts
│   │   ├── useExerciseHistory.ts
│   │   └── useWorkoutSession.ts (legacy)
│   │
│   └── lib/                # Utilidades y configuración
│       ├── supabase.ts     # Cliente de Supabase
│       ├── types.ts        # Tipos TypeScript
│       ├── utils.ts        # Funciones utilitarias
│       └── routine.ts      # Helpers de rutina (legacy)
│
└── supabase/               # Scripts SQL (NO se ejecutan desde la app)
    ├── supabase-schema-v2.sql
    ├── supabase-schema.sql
    └── supabase-migration-add-*.sql
```

---

## 5. Patrones de diseño utilizados

### 5.1. Provider Pattern (Context API)

**Uso:** `HabitsProvider` y `UserProfileProvider` envuelven la app para compartir estado.

**Ventajas:**
- Evita prop drilling.
- Estado global accesible desde cualquier componente.
- Separación entre estado y UI.

### 5.2. Custom Hooks Pattern

**Uso:** Hooks personalizados encapsulan lógica reutilizable.

**Ventajas:**
- Reutilización de lógica.
- Separación de responsabilidades.
- Fácil de testear.

### 5.3. Optimistic Updates

**Uso:** Actualización inmediata del estado local antes de confirmar con Supabase.

**Ventajas:**
- UI más rápida.
- Mejor UX.

### 5.4. Single Source of Truth

**Uso:** Supabase como fuente de verdad; `localStorage` como backup.

**Ventajas:**
- Consistencia de datos.
- Sincronización entre dispositivos.

---

## 6. Backend (Supabase)

### 6.1. Base de datos

**Tablas principales:**
- `user_profiles`: perfil básico del usuario.
- `weekly_routines`: rutina semanal (7 días).
- `routine_blocks`: bloques de ejercicios (días de musculación).
- `routine_exercises`: ejercicios dentro de cada bloque.
- `workout_sessions`: sesiones de entrenamiento ejecutadas.
- `strength_logs`: logs de ejercicios de musculación (peso, repeticiones).
- `running_logs`: logs de sesiones de running.
- `aerobic_logs`: logs de sesiones aeróbicas.
- `day_habits`: hábitos diarios (movimiento, estudio, lectura, nutrición).
- `custom_habit_definitions`: definiciones de hábitos personalizados.

### 6.2. Seguridad (RLS)

- Row Level Security activado en todas las tablas.
- Políticas que garantizan que cada usuario solo accede a sus datos.
- Autenticación mediante Supabase Auth.

### 6.3. Scripts SQL

**Ubicación:** `supabase/`

- `supabase-schema-v2.sql`: esquema principal (tablas + RLS).
- `supabase-migration-add-*.sql`: migraciones incrementales.

**Nota:** Estos archivos no se ejecutan desde la app; se copian y ejecutan manualmente en el SQL Editor de Supabase.

---

## 7. Flujo de ejecución de la aplicación

1. **`index.html`** carga → Vite inyecta el script `/src/main.tsx`.
2. **`main.tsx`** ejecuta → `ReactDOM.createRoot()` monta `<App />` en `#root`.
3. **`App.tsx`** ejecuta:
   - `useTheme()` aplica tema desde `localStorage`.
   - `useAuth()` verifica sesión con Supabase.
   - Si `loading` → muestra "Cargando...".
   - Si no hay `user` → muestra `<Auth />`.
   - Si hay `user` → muestra `<MainDashboard />` envuelto en Providers.
4. **Providers** se montan:
   - `HabitsProvider` carga hábitos desde Supabase.
   - `UserProfileProvider` carga perfil desde Supabase.
5. **`MainDashboard`** se monta:
   - Usa hooks y contextos para obtener datos.
   - Renderiza UI según el estado.
6. **Usuario interactúa:**
   - Componente llama función del contexto/hook.
   - Contexto/hook actualiza estado local y Supabase.
   - React re-renderiza automáticamente.

---

## 8. Ventajas de esta arquitectura

1. **Separación de responsabilidades:** UI, estado, lógica y servicios en capas claras.
2. **Escalabilidad:** Fácil añadir features sin afectar otras partes.
3. **Mantenibilidad:** Código organizado y fácil de entender.
4. **Reutilización:** Hooks y contextos reutilizables.
5. **Type safety:** TypeScript en toda la app.
6. **Performance:** Optimistic updates y carga eficiente de datos.
7. **Sincronización:** Supabase sincroniza datos entre dispositivos.
8. **Seguridad:** RLS garantiza acceso solo a datos propios.

---

## 9. Tecnologías y herramientas

| Tecnología | Rol |
|------------|-----|
| **React 18** | Librería de UI. |
| **TypeScript** | Tipado estático. |
| **Vite** | Build tool y dev server. |
| **Supabase** | Backend (PostgreSQL + Auth + API). |
| **TailwindCSS** | Estilos utility-first. |
| **PostCSS** | Procesamiento de CSS. |
| **Lucide React** | Iconos. |
| **React Router DOM** | (instalado pero no usado actualmente). |

---

## Conclusión

El proyecto sigue una **arquitectura en capas** con separación clara entre UI, estado, lógica y servicios. Usa **React** con **Context API** para estado global, **custom hooks** para lógica reutilizable y **Supabase** como backend. La estructura facilita el mantenimiento, la escalabilidad y la colaboración.
