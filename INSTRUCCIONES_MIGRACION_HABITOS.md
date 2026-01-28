# 📋 Instrucciones para Migrar Hábitos a Supabase

## ✅ Pasos para Activar el Guardado de Hábitos en Supabase

### 1. Ejecutar la Migración SQL en Supabase

1. Ve a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Navega a **SQL Editor** (en el menú lateral)
3. Haz clic en **New Query**
4. Abre el archivo `supabase-migration-add-day-habits.sql` en tu editor
5. Copia todo el contenido del archivo
6. Pégalo en el SQL Editor de Supabase
7. Haz clic en **Run** (o presiona `Ctrl+Enter`)

### 2. Verificar que las Tablas se Crearon Correctamente

En el SQL Editor, ejecuta:

```sql
SELECT * FROM day_habits LIMIT 1;
SELECT * FROM custom_habit_definitions LIMIT 1;
```

Si no hay errores, las tablas se crearon correctamente.

### 3. ¡Listo!

Una vez ejecutada la migración:

- ✅ Todos los hábitos nuevos se guardarán automáticamente en Supabase
- ✅ Los datos existentes en localStorage se migrarán automáticamente la primera vez que inicies sesión
- ✅ Tus hábitos estarán disponibles desde cualquier dispositivo
- ✅ Los datos se sincronizarán automáticamente entre dispositivos

## 🔄 ¿Qué Cambió?

### Antes:
- Los hábitos se guardaban solo en `localStorage` del navegador
- No se sincronizaban entre dispositivos
- Se perdían al limpiar el cache

### Ahora:
- Los hábitos se guardan en **Supabase** (en la nube)
- Se sincronizan automáticamente entre todos tus dispositivos
- Se mantiene `localStorage` como backup local
- Los datos persisten incluso si cambias de navegador o dispositivo

## 📊 Datos que se Guardan en Supabase

- ✅ Hábitos diarios (movimiento, estudio, lectura)
- ✅ Nutrición (comidas y puntuaciones)
- ✅ Hábitos personalizados y sus definiciones
- ✅ Estado de rutina completada vs movimiento manual

## 🐛 Solución de Problemas

### Error: "relation day_habits does not exist"
- **Solución**: Ejecuta la migración SQL primero

### Error: "permission denied for table day_habits"
- **Solución**: Verifica que las políticas RLS se crearon correctamente. Ejecuta la migración completa nuevamente.

### Los datos no se sincronizan
- **Solución**: 
  1. Verifica que estás autenticado (inicia sesión)
  2. Revisa la consola del navegador para errores
  3. Verifica que las variables de entorno `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY` estén configuradas

### Los datos antiguos no aparecen
- **Solución**: Los datos de localStorage se migran automáticamente la primera vez que inicias sesión después de ejecutar la migración. Si no aparecen, cierra sesión y vuelve a iniciar sesión.

## 📝 Notas Importantes

- La migración es **segura** y no afecta datos existentes
- Los datos en localStorage se mantienen como backup
- Puedes usar la aplicación sin conexión (usará localStorage) y se sincronizará cuando vuelvas a tener conexión
- Cada usuario solo ve sus propios hábitos (seguridad RLS activada)
