# AgendaSalud — Documento de Contexto y Hoja de Ruta (rama `dev`)

> Referencia técnica para llevar AgendaSalud a un producto vendible a clínicas y
> profesionales de la salud.
>
> **Autor:** Emmanuel Denis · **Rama:** `dev` · **Actualizado:** 2026-09-14

> ## 📌 Estado
> - **Consolidado en Supabase**, MongoDB eliminado. ✅
> - Modelo de datos central: tabla **`persona`** + roles `paciente` / `profesional`.
> - Modelo de venta objetivo: **SaaS multi-clínica** (Fase 2).
> - **Fase 0 (seguridad) aplicada sobre `dev`.** Ver §7 (changelog).
> - **Fase 1 aplicada sobre `dev`:** historia clínica reconstruida en Supabase + endpoints de reservas. Ver §7.
> - ⚠️ **Requiere correr en Supabase** la Sección B de `db/esquema_supabase.sql` (tablas `registro_clinico`, `registro_diente` y `ALTER persona ADD email`) antes de usar historia clínica.

---

## 1. Qué es
Plataforma web de **turnos médicos** + **registro clínico**, con módulo de **odontología**
(odontograma + valor/aumento de ortodoncia). Usuarios: paciente, profesional y admin.

## 2. Stack
- Node.js 22 · Express 5 · **Supabase** (PostgreSQL + Auth + Storage).
- Frontend: HTML + CSS + JS vanilla, estático desde `/public`.
- Integraciones: Google Calendar (Service Account), Twilio (WhatsApp, hoy inactivo), Nodemailer.

## 3. Modelo de datos (Supabase, "persona")
Detalle y DDL en **`db/esquema_supabase.sql`**.

| Tabla | Rol |
|-------|-----|
| `persona` | Datos comunes: `id`, `id_auth`→auth.users, `dni`, `nombre`, `apellido`, `fecha_nacimiento`, `telefono`, `direccion`, `sexo` |
| `paciente` | `id`, `id_persona`, `obra_social` |
| `profesional` | `id`, `id_persona`, `telefono`, `direccion`, `matricula`, `id_calendario`, `descripcion`, `precio` |
| `especialidad` / `especialidad_profesional` | Catálogo de áreas y su relación N:M con profesional |
| `horario_profesional` | Agenda del profesional (`id_profesional`, `dia`, `horario_inicio`, `horario_fin`) |
| `pacientes_ortodoncia` | `id_paciente`, `valor`, `aumento` |
| `registro_clinico` / `registro_diente` | **Nuevas (Fase 1):** historia clínica + odontograma |

**Dos identificadores en sesión** (`authController.login`): `req.session.user.id` = auth
(`persona.id_auth`), y `req.session.user.idRole` = `profesional.id`. Cada controller usa el
que corresponde: `get-datos-prof` y avatars → `id`; `get-esp-prof`, `save-*` y horarios → `idRole`.

## 4. Seguridad (estado tras Fase 0)
- ✅ Middleware `middleware/auth.js` (`requireAuth`/`requireRole`/`requireAdmin`) en rutas privadas.
- ✅ El `user_id` se toma de la **sesión**, no del body → IDOR cerrado.
- ✅ `helmet`, CORS con lista blanca (`ALLOWED_ORIGINS`), rate-limit, cookies seguras en prod, `sameSite`.
- ✅ Sin variable global `CALENDAR_ID`: el `calendarId` viaja por request.
- ✅ Credenciales de Google desde memoria (no se escribe JSON a disco).
- ⏳ **Pendiente:** validación de entrada (`zod`/`express-validator`); RLS por clínica (Fase 2);
  confirmar que `SUPABASE_KEY` sea `service_role` solo en servidor.

## 5. Bugs conocidos de `dev`
- ✅ `authController.login`: typo `rol`→`role` corregido (Fase 1). El login web sigue forzando
  `role = "profesional"` (por diseño actual: los pacientes no inician sesión en la web).
- ✅ `pacienteController` reescrito sobre Supabase (Fase 1).
- ✅ `main.js` ya no tiene IP hardcodeada: usa rutas relativas (Fase 1).

## 6. Fase 1 — Plan (reconstrucción sobre Supabase)

### 6.1 Endpoints que el frontend llama y NO existen (crear)
| Endpoint | Método | Lo usa | Qué debe hacer |
|----------|--------|--------|----------------|
| `/professionals` | GET | `select-prof.js`, `main.js` | Listar especialidades + profesionales (join `especialidad_profesional`+`profesional`+`persona`). |
| `/auth/get-area` | POST | `registroclinico*.js` | Especialidad del profesional autenticado (usar **sesión**). |
| `/auth/save-area` | POST | `main.js` | Asignar especialidad a un profesional. |
| `/auth/get-calenID` | POST | `select-prof.js` | `id_calendario` del profesional elegido (recibir id, no nombre). |
| `/api/get-hours` | GET | `main.js` | Horarios de profesionales para calcular slots. |
| `/pacient/regis-pacient` | POST | `registroclinico*.js` | Alta de `persona`+`paciente` + primer `registro_clinico` (+dientes). Rol profesional. |
| `/pacient/save-data-pacient` | POST | `registroclinico*.js` | Nuevo `registro_clinico` para un paciente (busca por DNI). Rol profesional. |
| `/pacient/get-data-pacient` | POST | `registroclinico*.js`, `historiaclinica.js` | Paciente + historial. **Sin** `password`; acceso por sesión del profesional. |

### 6.2 Frontend
1. Quitar IP hardcodeada de `main.js` (usar rutas relativas).
2. Enviar `calendarId` por request en `/available-slots`, `/create-event`, `/search-appointment`, `/delete-appointment` (ya no hay `/set-calendar`).
3. Reconstruir `select-prof.js` contra el nuevo `/professionals`.
4. Historia clínica: dejar de usar `dni + password`.

### 6.3 Otros
- `/available-slots` debe respetar `horario_profesional` (hoy usa 8–20 fijo como placeholder).
- Recordatorios Twilio/Nodemailer (confirmación + 24 h antes).

## 7. Changelog

### 2026-09-14 — Fase 1 sobre `dev`
- **Historia clínica en Supabase:** nuevo `controllers/pacienteController.js` + `routes/pacienteRoutes.js`
  (rol profesional): `/pacient/regis-pacient`, `/pacient/save-data-pacient`, `/pacient/get-data-pacient`.
  El profesional (id, nombre, área) se deriva de la **sesión**, no del body; snapshot en `registro_clinico`.
  Se guarda el odontograma en `registro_diente`. Ya **no** se usa `dni + password` para leer la historia.
- **Reservas:** nuevos `controllers/publicController.js` + `routes/publicRoutes.js` (públicos):
  `GET /professionals` (agrupado por área, con `id` e `id_calendario`) y `GET /api/get-hours`.
- **Auth:** `authController.getArea` (por sesión), `getCalenID` (por **id**, público), `saveArea`;
  corregido el typo `rol`→`role` en `login` (§5). El rate-limit estricto pasó a login/register.
- **`/api/user`** ahora devuelve también `fullName` y `email`.
- **Frontend:** `main.js` sin IP hardcodeada (rutas relativas) y el `calendarId` viaja por request
  (`window.CALENDAR_ID`, publicado por `select-prof.js`); se eliminó `/set-calendar`. El `<select>` de
  profesionales usa el `id` como value. Historia clínica dejó de enviar `password`.
- **DB:** `ALTER TABLE persona ADD COLUMN IF NOT EXISTS email` (aditivo) + Sección B (historia clínica).

### 2026-09-13 — Fase 0 sobre `dev`
- Eliminado MongoDB (`models/`, `config/database.js`, `pacienteController`, `pacienteRoutes`,
  `dashboardConfig copy.js`); quitadas deps `mongoose`/`mongodb`/`connect-mongo`/`node`.
- Nuevo `middleware/auth.js`; rutas privadas protegidas por rol/sesión.
- Controllers: `user_id` desde la sesión (mapeo correcto `id` vs `idRole`) → IDOR cerrado.
- `index.js` endurecido: helmet, CORS allowlist, rate-limit, cookies seguras, store de sesión
  con `connect-pg-simple`; sin `CALENDAR_ID` global; credenciales de Google desde memoria;
  se conservó `/especialidades` (público) e `idRole` en `/api/user`.
- Añadidos `.env.example`, metadata en `package.json`, `db/esquema_supabase.sql`.

## 8. Decisiones
- [x] Todo en Supabase, sin MongoDB.
- [x] Modelo de venta: SaaS multi-clínica.
- [ ] Pasarela de pago: ¿Mercado Pago (AR) o Stripe? *(pendiente)*
- [ ] Frontend: ¿seguir en vanilla JS o migrar a framework? *(pendiente)*

## 9. Cómo correr
```bash
npm install
cp .env.example .env   # completar valores
npm run dev            # o: npm start
```
