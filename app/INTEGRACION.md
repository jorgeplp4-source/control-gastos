# 🧩 Módulos Nuevos — Guía de Integración

## Archivos incluidos en este ZIP

```
nuevos-modulos/
├── 000_migration.sql                    → Ejecutar en Supabase SQL Editor
├── supabase-function-process-recurring.ts → Edge Function de recurrentes
├── messages/
│   ├── es.json                          → Traducciones español
│   └── en.json                          → Traducciones inglés
├── context/
│   └── AppContext.js                    → Context global (tema, i18n, settings)
├── config/
│   └── ConfigPage.js                    → Página de configuración completa
├── recurrentes/
│   └── RecurrentesPage.js              → Módulo de gastos recurrentes
├── quickadd/
│   └── QuickAddPage.js                 → Página de gasto rápido (PWA shortcut)
├── NotificationsBell.js                → Campana de notificaciones
├── globals.css                         → CSS con variables para tema claro/oscuro
├── manifest.json                       → PWA manifest con shortcuts
├── layout.js                           → Layout raíz actualizado
└── page.js                             → Página principal actualizada
```

---

## PASO 1 — Supabase: ejecutar migración

Ir a **Supabase Dashboard → SQL Editor** y ejecutar el contenido completo de `000_migration.sql`.

Esto crea:
- Tabla `user_settings` (configuración por usuario)
- Tabla `recurring_expenses` (gastos recurrentes)
- Tabla `notificaciones` (inbox interno)
- Columna `recurring_id` en `gastos`
- Todas las políticas RLS

---

## PASO 2 — Copiar archivos a tu proyecto

### Archivos NUEVOS (simplemente agregar):
```bash
# Crear carpetas necesarias
mkdir -p app/quick-add context components/config

# Copiar archivos nuevos
cp messages/es.json          public/messages/es.json
cp messages/en.json          public/messages/en.json
cp context/AppContext.js     context/AppContext.js
cp config/ConfigPage.js      components/ConfigPage.js
cp recurrentes/RecurrentesPage.js  components/RecurrentesPage.js
cp quickadd/QuickAddPage.js  app/quick-add/page.js
cp NotificationsBell.js      components/NotificationsBell.js
cp manifest.json             public/manifest.json
```

### Archivos a REEMPLAZAR:
```bash
cp globals.css   app/globals.css    # ← reemplaza el actual
cp layout.js     app/layout.js      # ← reemplaza el actual
cp page.js       app/page.js        # ← reemplaza el actual
```

---

## PASO 3 — Supabase Edge Function (recurrentes automáticos)

1. Instalar Supabase CLI si no lo tenés:
   ```bash
   npm install -g supabase
   ```

2. Crear la función:
   ```bash
   supabase functions new process-recurring
   ```

3. Copiar el contenido de `supabase-function-process-recurring.ts` a:
   `supabase/functions/process-recurring/index.ts`

4. Deployar:
   ```bash
   supabase functions deploy process-recurring --project-ref TU_PROJECT_ID
   ```

5. En Supabase Dashboard → **Extensions** → activar `pg_cron`

6. En SQL Editor, programar ejecución diaria:
   ```sql
   select cron.schedule(
     'process-recurring-expenses',
     '5 3 * * *',
     $$select net.http_post(
       url := 'https://TU_PROJECT_ID.supabase.co/functions/v1/process-recurring',
       headers := '{"Authorization": "Bearer TU_ANON_KEY"}'::jsonb
     )$$
   );
   ```

---

## PASO 4 — Iconos PWA (opcional pero recomendado)

Crear o usar un generador online (https://maskable.app) para generar:
- `public/icons/icon-192.png`
- `public/icons/icon-512.png`
- `public/icons/shortcut-add.png` (96x96)
- `public/icons/shortcut-list.png` (96x96)

---

## PASO 5 — Commit y deploy

```bash
git add .
git commit -m "feat: módulos configuración, recurrentes, PWA quick-add"
git push
```

Vercel redeploya automáticamente.

---

## Resumen de funcionalidades agregadas

### ⚙️ Configuración
- Tema claro / oscuro / sistema (con CSS variables, sin flash)
- Selector de idioma ES / EN (i18n con archivos JSON en /public)
- Selector de moneda (9 monedas con formato Intl)
- Selector de formato de fecha
- Gestión de categorías personalizadas con drag & drop
- Persistencia en Supabase por usuario

### 🔁 Gastos Recurrentes
- CRUD completo con frecuencias: diaria, semanal, quincenal, mensual, custom
- Pausar/activar por toggle
- Procesamiento automático vía Edge Function + pg_cron
- Validación antiduplicate
- Notificaciones internas cuando se genera un gasto automático

### 🔔 Notificaciones
- Campana en el header con badge de no leídas
- Dropdown con lista y "marcar como leídas"
- Alimentada por la Edge Function de recurrentes

### ⚡ Quick Add (PWA)
- Ruta `/quick-add` optimizada para mobile
- Shortcut en manifest.json (long-press en el ícono de la app)
- Formulario de 3 campos: monto + categoría + fecha
- Navega con chips visuales para N1, dropdowns para N2/N3/N4

### 🌙 Tema oscuro
- Variables CSS en `globals.css`
- `data-theme="dark"` en `<html>` controlado por AppContext
- Sincronización con preferencia del sistema
- Guardado en Supabase por usuario

---

## Notas técnicas

**i18n**: Los mensajes viven en `/public/messages/*.json` y se cargan via `fetch` en el cliente. Para agregar un idioma nuevo solo agregás un archivo JSON y lo añadís al selector en ConfigPage.

**Tema**: El `suppressHydrationWarning` en `<html>` es necesario para evitar el error de hidratación cuando Next.js renderiza en server con `data-theme` distinto al que aplica el cliente.

**Recurrentes**: La Edge Function corre diariamente. Si querés probarla manualmente, podés hacer un POST desde Supabase Dashboard → Edge Functions → Invoke.
