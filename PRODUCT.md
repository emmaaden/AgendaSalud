# Product

<!-- impeccable:product-schema 1 -->

> Todo este archivo fue **inferido del código** (README, rutas, copy de `frontend/src`) sin entrevista, por pedido del autor. Revisar y corregir lo que no sea correcto.

## Platform

web

## Users

- **Pacientes** (inferido): reservan turnos, consultan y gestionan sus turnos, ven su historia clínica, certificados y estudios. Uso mayormente ocasional y desde el celular ("Desde cualquier dispositivo").
- **Profesionales de la salud** (inferido): gestionan agenda, registro clínico, historias clínicas, certificados, estudios y odontograma. Uso diario, repetitivo, en consultorio.
- **Recepción** (inferido): rol con registro propio; opera la agenda de turnos por la clínica.
- **Administración de clínica** (inferido): ruta `/dashboard/admin`; multi-clínica vía `/seleccionar-clinica`.

## Product Purpose

Plataforma para gestionar turnos médicos y registrar información clínica: el paciente reserva en minutos y recibe confirmación por email; el profesional ordena agenda, pacientes y clínica desde un panel. Éxito = turnos reservados sin llamadas ni esperas y registro clínico completo y ordenado.

## Positioning

Abierto (no confirmado). Evidencia: combina turnos online + historia clínica digital + herramientas odontológicas (odontograma por caras, consulta de valor de ortodoncia por DNI) en un solo producto para consultorios pequeños de Argentina.

## Operating Context

- Argentina (zona horaria `America/Argentina/Buenos_Aires`), español rioplatense con voseo ("Reservá", "Elegí").
- Soporte por WhatsApp y email (`frontend/src/lib/site.ts`).
- Integración con Google Calendar y confirmaciones por email (README).
- Genera PDFs de paciente (`frontend/src/lib/patientPdf.ts`).

## Capabilities and Constraints

- Frontend: React + Vite + TypeScript + Tailwind v4 + shadcn/ui; siempre componentes de `@/components/ui`, sin CSS arbitrario (ver `CLAUDE.md`).
- Backend: Node/Express + Supabase con RLS por JWT; CSP estricta en la SPA.
- Roles: paciente, profesional, recepción, admin. Multi-clínica.
- Planes: Básico y superiores (`/planes`); los precios concretos no están confirmados en este archivo.

## Brand Commitments

- Nombre: **AgendaSalud**. Logo en `frontend/src/components/site/Logo.tsx`.
- Voz: cercana, clara, en voseo; promete seguridad y confidencialidad de la información clínica.

## Evidence on Hand

- Imagen hero: `frontend/src/assets/hero.png`.
- No hay testimonios, clientes, cifras ni casos reales: **no inventarlos**.

## Product Principles

1. La tarea primero: reservar o registrar debe ser rápido y sin fricción.
2. Confianza: datos clínicos tratados con seguridad visible y lenguaje sobrio.
3. Cualquier dispositivo: el paciente usa el celular; el profesional, la computadora.
4. Un mismo producto para roles distintos: cada uno ve solo lo suyo.

## Accessibility & Inclusion

Sin requisito formal confirmado. Por tratarse de salud y de pacientes de cualquier edad, apuntar a WCAG 2.2 AA (inferido).
