# 💰 Control de Gastos Diarios

App de registro y control de gastos con categorización de 4 niveles, autenticación por usuario y base de datos en la nube.

**Stack:** Next.js 15 · Supabase (Auth + PostgreSQL) · Recharts · Vercel

---

## 🚀 Deploy en 4 pasos

### PASO 1 — Crear proyecto en Supabase

1. Ir a **https://supabase.com** → Sign Up (gratis.)
2. Crear un nuevo proyecto (elegí región: South America)
3. Esperar que termine de inicializarse (~2 min)
4. Ir a **Settings → API** y copiar:
   - `Project URL` → será tu `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → será tu `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

### PASO 2 — Crear la tabla en Supabase

En tu proyecto de Supabase ir a **SQL Editor** y ejecutar este script:

```sql
-- Tabla de gastos
create table public.gastos (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users(id) on delete cascade not null,
  n1          text not null,
  n2          text not null,
  n3          text not null,
  n4          text not null,
  cantidad    numeric not null,
  unidad      text not null default 'unidad',
  monto       numeric not null,
  fecha       date not null,
  observaciones text,
  created_at  timestamptz default now()
);

-- Índice para performance
create index gastos_user_fecha on public.gastos(user_id, fecha desc);

-- Row Level Security: cada usuario solo ve sus propios gastos
alter table public.gastos enable row level security;

create policy "usuarios ven sus gastos"
  on public.gastos for select
  using (auth.uid() = user_id);

create policy "usuarios insertan sus gastos"
  on public.gastos for insert
  with check (auth.uid() = user_id);

create policy "usuarios actualizan sus gastos"
  on public.gastos for update
  using (auth.uid() = user_id);

create policy "usuarios eliminan sus gastos"
  on public.gastos for delete
  using (auth.uid() = user_id);
```

---

### PASO 3 — Subir a GitHub

```bash
# En la carpeta del proyecto
git init
git add .
git commit -m "first commit: control de gastos"

# Crear repo en github.com y luego:
git remote add origin https://github.com/TU_USUARIO/control-gastos.git
git branch -M main
git push -u origin main
```

---

### PASO 4 — Deploy en Vercel

1. Ir a **https://vercel.com** → Sign Up con tu cuenta de GitHub
2. Click **"Add New Project"** → importar tu repo `control-gastos`
3. En **Environment Variables** agregar:
   ```
   NEXT_PUBLIC_SUPABASE_URL     = https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY = eyJxxx...
   ```
4. Click **Deploy** ✅

En ~2 minutos tu app estará en `https://control-gastos-xxx.vercel.app`

---

## 💻 Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local
# Editar .env.local con tus keys de Supabase

# Correr en modo desarrollo
npm run dev
# → http://localhost:3000
```

---

## 📁 Estructura del proyecto

```
control-gastos/
├── app/
│   ├── api/
│   │   └── gastos/
│   │       └── route.js        ← API REST (GET/POST/PUT/DELETE)
│   ├── login/
│   │   └── page.js             ← Página de login/signup
│   ├── globals.css
│   ├── layout.js
│   └── page.js                 ← App principal (dashboard, form, listado)
├── components/
│   ├── Dashboard.js            ← Gráficos y KPIs
│   ├── ExpenseForm.js          ← Formulario con cascada de 4 niveles
│   └── ListView.js             ← Tabla con filtros
├── lib/
│   ├── constants.js            ← Categorías CSV, colores, helpers
│   ├── supabase-browser.js     ← Cliente Supabase (browser)
│   └── supabase-server.js      ← Cliente Supabase (server/API)
├── middleware.js                ← Protección de rutas (auth)
├── .env.example
└── package.json
```

---

## 🔐 Autenticación

- Cada usuario tiene su cuenta independiente (email + contraseña)
- Los datos están aislados por `user_id` (RLS en Supabase)
- Las rutas están protegidas por middleware de Next.js
- El registro y login está en `/login`

---

## 📊 Funcionalidades

- **Dashboard**: KPIs, gráficos de barras, torta y ranking de ítems
- **Registro**: Selectores en cascada de 4 niveles desde tu CSV
- **Listado**: Filtros por tipo/fecha/búsqueda, resumen por tipo, tabla editable
- **CRUD completo**: crear, editar, eliminar gastos
