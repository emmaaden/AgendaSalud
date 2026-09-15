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
- ✅ Validación de entrada con **zod** (`middleware/validate.js` + `validators/schemas.js`) en
  auth, historia clínica, profesional, horarios, ortodoncia y endpoints de calendario.
- ✅ **RLS real por JWT (Fase 2c):** políticas por `clinica_id` en Postgres, aplicadas al
  operar con el JWT del usuario (rol `authenticated`). Piloto: historia clínica
  (`pacienteController`). Resto de controllers aún en `service_role` (rollout pendiente).
- ⏳ **Pendiente:** migrar el resto de los controllers autenticados al cliente por-JWT
  (ortodoncia, profesional, horarios, clínica); confirmar que `SUPABASE_KEY` sea
  `service_role` solo en servidor.

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
- ✅ `/available-slots` respeta `horario_profesional` por día (recibe `profId`, deriva el
  calendario y genera slots de 30' en la franja del día, excluyendo eventos). Fase reservas.
- ✅ Recordatorios por email (Nodemailer): confirmación al reservar + recordatorio ~24 h antes
  (scheduler in-process + endpoint `/internal/send-reminders` para cron externo).
  **Requiere configurar `EMAIL_*` (SMTP)** y, para el cron externo, `REMINDERS_TOKEN`.
  WhatsApp (Twilio) sigue inactivo.

## 7. Changelog

### 2026-09-15 — Fase 2c: RLS real por JWT de usuario
- **El aislamiento por clínica ahora lo garantiza Postgres**, no solo la app. Para las
  operaciones de usuario autenticado el backend usa la anon key + el JWT del usuario
  (rol `authenticated`) y las políticas RLS filtran por `clinica_id` a partir de `auth.uid()`.
  El `service_role` (resto del backend) saltea la RLS, así que los endpoints no migrados
  siguen igual.
- **DB:** `db/fase2c_rls_jwt.sql` — función `app_current_clinica_id()` (SECURITY DEFINER,
  deriva la clínica del `auth.uid()`) + RLS y políticas en `persona`, `profesional`,
  `paciente`, `registro_clinico`, `registro_diente`, `especialidad_profesional`, y lectura
  del catálogo `especialidad`. Idempotente, con rollback documentado. **Requiere correrlo en Supabase.**
- **App:** `config/supabaseClient.js` expone `supabaseAnon` y `userClientFromToken(jwt)`;
  `authController.login` guarda `access/refresh/expiresAt` en la sesión;
  `middleware/userSupabase.js` (`getUserSupabase(req)`) arma el cliente por-request y refresca
  el token si vence. **Piloto:** `pacienteController` (historia clínica) migrado.
- ⚠️ Las sesiones abiertas de antes de 2c no tienen el token guardado → deben reloguearse
  para usar la historia clínica (el login nuevo captura el JWT).
- **Verificado** con JWTs reales (usuarios descartables en 2 clínicas): lectura aislada,
  bloqueo de lectura cross-tenant, rechazo de INSERT con `clinica_id` ajeno (WITH CHECK,
  error 42501), e historia clínica funcionando por el stack completo login→RLS.

### 2026-09-15 — Fase 2b: turnos públicos por clínica (aislamiento por tenant)
- **Cierra el aislamiento del lado público:** antes `/professionals` mezclaba los
  profesionales de todas las clínicas. Ahora cada clínica tiene su URL de reservas
  `turnos.html?clinica=<slug>` y el listado se filtra a sus profesionales.
- **DB:** `db/fase2b_turnos_publicos.sql` — columna `clinica.slug` (única) + backfill
  de slugs para las clínicas existentes. **Requiere correrlo en Supabase** después de
  `fase2_multiclinica.sql`.
- **Backend:** `publicController` resuelve `?clinica=<slug>` → `clinica_id` y filtra
  `/professionals` y `/api/get-hours`; nuevo `GET /clinica-publica` para el encabezado.
  Sin slug se mantiene el listado completo (despliegue de una sola clínica).
  `authController.register` genera el slug al crear una clínica; `/clinica/info` lo devuelve.
- **Frontend:** `select-prof.js` lee el slug de la URL y muestra el nombre de la clínica;
  `dashboard.js` muestra al admin su link público de turnos con botón de copiar.
- **Endurecimiento `/create-event`:** el calendario ya NO se toma del cliente. El endpoint
  recibe `profId` (+ `clinica` opcional), deriva el `id_calendario` del profesional desde
  la DB y, si viene el slug, valida que el profesional pertenezca a esa clínica (403 si no).
  Cierra dos agujeros: inyección de eventos en un calendario arbitrario y reserva cross-tenant.
  `main.js` ahora envía `profId` + `clinica` (el `calendarId` quedó como legacy ignorado).

### 2026-09-14 — Validación de entrada (zod)
- `middleware/validate.js`: gate que valida `req.body/query/params` con zod y responde 400 con
  el detalle de campos inválidos (no muta el request, para no descartar campos dinámicos).
- `validators/schemas.js`: schemas por área (auth, pacient, profesional, horario, ortodoncia,
  calendar). Aplicados en todas las rutas con entrada del usuario.
- Se quitaron los chequeos manuales de "campo faltante" que ahora cubre el validador.

### 2026-09-14 — Reservas: recordatorio ~24 h antes (§6.3)
- `sendUpcomingReminders()`: recorre los calendarios de los profesionales, busca turnos que
  empiezan en ~24 h, envía email al paciente (email tomado de la descripción) y marca el evento
  (`extendedProperties.reminded`) para no repetir.
- `POST /internal/send-reminders` protegido por `REMINDERS_TOKEN` (para cron externo) +
  scheduler in-process cada 60 min (solo si el mailer está configurado).

### 2026-09-14 — Reservas: slots según horario del profesional (§6.3)
- `/available-slots` ahora recibe `profId` (no `calendarId`): deriva el `id_calendario` y el
  `horario_profesional` del día pedido, genera franjas de 30' dentro del horario real y excluye
  los eventos ya agendados. Devuelve solo turnos futuros. Días sin atención → `[]`.
- Zona horaria fija AR (UTC-3) con offset `-03:00`; se eliminó el hack de `+3` del cliente.
- `main.js`: se sacó la dependencia de `/api/get-hours` y todo el cálculo cliente de slots;
  ahora solo muestra lo que devuelve el servidor. Al cambiar profesional/fecha se refresca.
- `select-prof.js`: al elegir profesional se fija `window.CALENDAR_ID` (para crear el turno).

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
