# 🏋️ Gym Tracker V2

Aplicación web de seguimiento de entrenamiento de gimnasio con **rutina semanal personalizable** y persistencia en la nube usando Supabase.

## 🚀 Características

- ✅ Autenticación con email y contraseña (Supabase Auth)
- ✅ **Rutina semanal personalizable** (configura los 7 días de la semana)
- ✅ **4 tipos de días**: Musculación, Running, Aeróbico, Descanso
- ✅ **Bloques de ejercicios** para días de musculación
- ✅ Registro de pesos y repeticiones por ejercicio y serie
- ✅ Registro de running (km, tiempo, calorías)
- ✅ Registro de ejercicios aeróbicos (ejercicio, tiempo, calorías)
- ✅ Marcar entrenamientos como completados
- ✅ Sincronización en tiempo real entre dispositivos
- ✅ Diseño mobile-first y responsive
- ✅ Seguridad con Row Level Security (RLS)

## 📋 Configuración de Rutina Semanal

Cada usuario configura su propia rutina semanal fija que se repite automáticamente:

### Tipos de Día Disponibles

1. **Musculación**
   - Crear bloques de ejercicios (ej: "Glúteos", "Core")
   - Configurar descanso entre series por bloque
   - Agregar ejercicios a cada bloque con series y repeticiones objetivo

2. **Running**
   - Registrar kilómetros, tiempo y calorías

3. **Aeróbico**
   - Registrar ejercicio, tiempo y calorías

4. **Descanso**
   - Día de descanso sin registro de datos

### Ejemplo de Configuración

- **Lunes**: Musculación (Bloque Glúteos: Hip Thrust, Sentadillas...)
- **Martes**: Running
- **Miércoles**: Descanso
- **Jueves**: Musculación (Bloque Core: Planchas, Abdominales...)
- **Viernes**: Aeróbico
- **Sábado**: Descanso
- **Domingo**: Running

## 🛠️ Stack Tecnológico

- **Frontend**: React 18 + TypeScript
- **Estilos**: TailwindCSS
- **Base de datos**: Supabase (PostgreSQL)
- **Autenticación**: Supabase Auth
- **Build Tool**: Vite

## 📦 Instalación

### 1. Clonar o descargar el proyecto

```bash
cd gym
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Configurar Supabase

1. Crea un proyecto en [Supabase](https://supabase.com)
2. Ve a **Settings** → **API** y copia:
   - **Project URL** (VITE_SUPABASE_URL)
   - **anon public** key (VITE_SUPABASE_ANON_KEY)

3. Crea un archivo `.env` en la raíz del proyecto:

```env
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-clave-anon-aqui
```

### 4. Configurar la base de datos

1. Ve al **SQL Editor** en tu proyecto de Supabase
2. **IMPORTANTE**: Ejecuta el contenido completo del archivo `supabase/supabase-schema-v2.sql`
3. Verifica que las tablas se hayan creado correctamente:
   - `user_profiles`
   - `weekly_routines`
   - `routine_blocks`
   - `routine_exercises`
   - `workout_sessions`
   - `strength_logs`
   - `running_logs`
   - `aerobic_logs`

### 5. Ejecutar la aplicación

```bash
npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 📁 Estructura del Proyecto

```
gym/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Auth.tsx        # Login/Registro
│   │   ├── Dashboard.tsx   # Vista principal
│   │   ├── Profile.tsx    # Configuración de rutina semanal
│   │   ├── MuscleDayConfig.tsx  # Configurar bloques y ejercicios
│   │   ├── WorkoutDayV2.tsx    # Entrenamiento del día
│   │   ├── StrengthWorkout.tsx # Ejecución de musculación
│   │   ├── RunningWorkout.tsx  # Ejecución de running
│   │   └── AerobicWorkout.tsx   # Ejecución de aeróbico
│   ├── hooks/              # Custom hooks
│   │   ├── useAuth.ts
│   │   ├── useWeeklyRoutine.ts
│   │   ├── useRoutineBlocks.ts
│   │   └── useWorkoutSessionV2.ts
│   ├── lib/                # Utilidades y configuración
│   │   ├── supabase.ts     # Cliente de Supabase
│   │   ├── types.ts        # Tipos TypeScript
│   │   └── utils.ts        # Funciones utilitarias
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── supabase-schema-v2.sql  # Esquema de BD V2 y políticas RLS
├── package.json
├── vite.config.ts
└── README.md
```

## 🗄️ Esquema de Base de Datos

### Tablas Principales

- **user_profiles**: Perfil básico del usuario
- **weekly_routines**: Configuración de rutina semanal (7 días)
- **routine_blocks**: Bloques de ejercicios para días de musculación
- **routine_exercises**: Ejercicios dentro de cada bloque
- **workout_sessions**: Sesiones de entrenamiento ejecutadas
- **strength_logs**: Logs de ejercicios de musculación (peso y repeticiones)
- **running_logs**: Logs de sesiones de running
- **aerobic_logs**: Logs de sesiones aeróbicas

### Seguridad

Todas las tablas tienen **Row Level Security (RLS)** activado, garantizando que cada usuario solo pueda acceder a sus propios datos.

## 🎯 Uso

### 1. Configurar Rutina Semanal (Primera vez)

1. Después de iniciar sesión, ve a **"Mi Rutina"**
2. Configura cada día de la semana (Lunes a Domingo):
   - Selecciona el tipo de día (Musculación, Running, Aeróbico, Descanso)
   - Para días de **Musculación**:
     - Crea bloques de ejercicios
     - Agrega ejercicios a cada bloque con series y repeticiones objetivo
     - Configura el descanso entre series por bloque

### 2. Ejecutar Entrenamiento Diario

1. La app detecta automáticamente qué día de la semana es
2. Muestra el entrenamiento configurado para ese día
3. Completa los datos según el tipo:
   - **Musculación**: Peso y repeticiones por serie
   - **Running**: Kilómetros, tiempo y calorías
   - **Aeróbico**: Nombre del ejercicio, tiempo y calorías
   - **Descanso**: Solo información
4. Marca "Entrenamiento realizado" si completaste la sesión
5. Haz clic en "Guardar Sesión"

### 3. Navegar entre Días

- Usa las flechas en el header para ver otros días
- Haz clic en la fecha para volver al día actual

## 🔒 Seguridad

- Autenticación mediante Supabase Auth
- Row Level Security (RLS) en todas las tablas
- Políticas que garantizan que cada usuario solo accede a sus datos
- Variables de entorno para credenciales sensibles

## 📱 Mobile First

La aplicación está diseñada pensando en móviles primero, con:
- Botones grandes y fáciles de tocar
- Diseño responsive
- Navegación intuitiva
- Cards y formularios optimizados para pantallas pequeñas

## 🚀 Despliegue

### Desplegar en Vercel (Recomendado - Gratis)

Para desplegar tu aplicación en Vercel y acceder desde tu celular, sigue la guía completa:

👉 **[Ver Guía Completa de Despliegue en Vercel](./DEPLOY_VERCEL.md)**

**Resumen rápido:**
1. Sube tu código a GitHub
2. Conecta tu repositorio con Vercel
3. Configura las variables de entorno (`VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`)
4. ¡Deploy automático! Tu app estará en línea en minutos

### Build Local

Si quieres hacer build localmente:

```bash
npm run build
```

Los archivos estarán en la carpeta `dist/`

### Otras Plataformas

También puedes desplegar en:
   - Netlify
   - GitHub Pages
   - Cualquier hosting estático

**Importante**: Asegúrate de configurar las variables de entorno en tu plataforma de despliegue.

## 📝 Notas Importantes

- **La rutina semanal es fija**: Una vez configurada, se repite automáticamente cada semana
- **La rutina solo se edita desde "Mi Rutina"**: Nunca desde la ejecución diaria
- **Los bloques agrupan ejercicios**: Útiles para organizar entrenamientos complejos
- **El descanso pertenece al bloque**: Cada bloque tiene su propio tiempo de descanso
- La aplicación usa la fecha local del sistema
- Los datos se sincronizan automáticamente entre dispositivos
- Puedes navegar entre días usando las flechas en el header

## 🔄 Migración desde V1

Si tenías la versión anterior:

1. **Backup de datos**: Exporta tus datos si los necesitas
2. **Ejecuta el nuevo esquema**: `supabase-schema-v2.sql` en Supabase
3. **Configura tu rutina**: Ve a "Mi Rutina" y configura los 7 días
4. Los datos antiguos no se migran automáticamente

## 🤝 Contribuciones

Este es un proyecto personal, pero siéntete libre de hacer fork y adaptarlo a tus necesidades.

## 📄 Licencia

MIT

---

Desarrollado con ❤️ usando React, TypeScript y Supabase
#   h a b i t s 
 
 