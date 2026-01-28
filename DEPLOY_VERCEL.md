# 🚀 Guía de Despliegue en Vercel (Gratis)

Esta guía te ayudará a subir tu aplicación Gym Tracker a Vercel de forma gratuita para poder acceder desde tu celular.

## 📋 Requisitos Previos

1. ✅ Cuenta en GitHub (gratis)
2. ✅ Cuenta en Vercel (gratis)
3. ✅ Tu proyecto ya configurado con Supabase

## 🔧 Paso 1: Preparar el Proyecto

### 1.1 Verificar que todo esté listo

Asegúrate de que:
- ✅ El proyecto funciona localmente (`npm run dev`)
- ✅ Tienes tus credenciales de Supabase (URL y Anon Key)
- ✅ El archivo `.env` está en `.gitignore` (ya está configurado)

### 1.2 Hacer commit de los cambios

```bash
git add .
git commit -m "Preparar para deploy en Vercel"
```

## 📤 Paso 2: Subir a GitHub

### 2.1 Crear un repositorio en GitHub

1. Ve a [github.com](https://github.com) e inicia sesión
2. Haz clic en el botón **"+"** (arriba a la derecha) → **"New repository"**
3. Nombre: `gym-tracker` (o el que prefieras)
4. Marca como **Private** si quieres (o Public)
5. **NO** marques "Initialize with README" (ya tienes archivos)
6. Haz clic en **"Create repository"**

### 2.2 Subir tu código

GitHub te mostrará comandos. Ejecuta estos en tu terminal (en la carpeta del proyecto):

```bash
# Si aún no tienes git inicializado
git init

# Agregar el repositorio remoto (reemplaza TU_USUARIO con tu usuario de GitHub)
git remote add origin https://github.com/TU_USUARIO/gym-tracker.git

# Subir el código
git branch -M main
git add .
git commit -m "Initial commit"
git push -u origin main
```

## 🌐 Paso 3: Desplegar en Vercel

### 3.1 Crear cuenta en Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Haz clic en **"Sign Up"**
3. Elige **"Continue with GitHub"** (más fácil)
4. Autoriza Vercel a acceder a tu GitHub

### 3.2 Importar el proyecto

1. En el dashboard de Vercel, haz clic en **"Add New..."** → **"Project"**
2. Busca tu repositorio `gym-tracker` y haz clic en **"Import"**

### 3.3 Configurar el proyecto

Vercel detectará automáticamente que es un proyecto Vite. Verás:

- **Framework Preset**: Vite (debería detectarlo automáticamente)
- **Root Directory**: `./` (dejar por defecto)
- **Build Command**: `npm run build` (ya configurado)
- **Output Directory**: `dist` (ya configurado)

### 3.4 Configurar Variables de Entorno

**MUY IMPORTANTE**: Aquí debes agregar tus credenciales de Supabase:

1. En la sección **"Environment Variables"**, haz clic en **"Add"**
2. Agrega estas dos variables:

   **Variable 1:**
   - **Name**: `VITE_SUPABASE_URL`
   - **Value**: Tu URL de Supabase (ej: `https://xxxxx.supabase.co`)
   - Marca los 3 ambientes: Production, Preview, Development

   **Variable 2:**
   - **Name**: `VITE_SUPABASE_ANON_KEY`
   - **Value**: Tu Anon Key de Supabase
   - Marca los 3 ambientes: Production, Preview, Development

3. Haz clic en **"Save"**

### 3.5 Desplegar

1. Haz clic en el botón **"Deploy"** (abajo a la derecha)
2. Espera 1-2 minutos mientras Vercel:
   - Instala dependencias
   - Compila el proyecto
   - Despliega la aplicación

## ✅ Paso 4: ¡Listo!

Una vez completado el deploy:

1. Vercel te dará una URL como: `https://gym-tracker-xxxxx.vercel.app`
2. **¡Esa es tu aplicación en vivo!** 🎉
3. Puedes abrirla desde tu celular usando esa URL
4. Puedes compartir el link con quien quieras

### 4.1 Dominio personalizado (opcional)

Si quieres un dominio más bonito:
1. En el dashboard de Vercel, ve a tu proyecto
2. Settings → Domains
3. Agrega tu dominio personalizado (si tienes uno)

## 🔄 Actualizar la Aplicación

Cada vez que hagas cambios:

1. Haz commit y push a GitHub:
   ```bash
   git add .
   git commit -m "Descripción de los cambios"
   git push
   ```

2. Vercel **automáticamente** detectará los cambios y desplegará una nueva versión
3. En 1-2 minutos tu aplicación estará actualizada

## 🐛 Solución de Problemas

### Error: "Build failed"

- Verifica que las variables de entorno estén configuradas correctamente
- Revisa los logs de build en Vercel para ver el error específico

### Error: "Supabase connection failed"

- Verifica que `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén correctamente configuradas
- Asegúrate de que las URLs de Supabase permitan conexiones desde cualquier origen (deberían por defecto)

### La aplicación no carga

- Espera unos minutos y recarga
- Verifica que el build haya sido exitoso en el dashboard de Vercel

## 📱 Acceder desde el Celular

1. Abre el navegador en tu celular
2. Ingresa la URL que te dio Vercel (ej: `https://gym-tracker-xxxxx.vercel.app`)
3. La aplicación se adaptará automáticamente al tamaño de la pantalla
4. Puedes agregarla a la pantalla de inicio como una "app" (opción del navegador)

## 🎉 ¡Listo!

Tu aplicación está en línea y accesible desde cualquier dispositivo con internet.

---

**Nota**: El plan gratuito de Vercel es muy generoso y debería ser suficiente para uso personal. Incluye:
- Deploy ilimitados
- 100GB de ancho de banda
- SSL automático (HTTPS)
- Dominio personalizado
