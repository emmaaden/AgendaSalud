/** Constantes compartidas del sitio público. */

export const WHATSAPP_NUMBER = "2615930274"
export const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}`
export const CONTACT_EMAIL = "emma26228@gmail.com"

/** Enlaces principales del navbar. */
export const NAV_LINKS = [
  { to: "/", label: "Inicio" },
  { to: "/turnos", label: "Turnos" },
  { to: "/planes", label: "Planes" },
  { to: "/historia-clinica", label: "Historia clínica" },
] as const

/** Enlaces de ayuda / secundarios usados en footer y menú móvil. */
export const HELP_URL = `${WHATSAPP_URL}?text=${encodeURIComponent(
  "Hola, necesito ayuda con AgendaSalud"
)}`
