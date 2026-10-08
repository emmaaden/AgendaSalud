// Aplica el tema guardado antes del primer pintado, para evitar un destello
// claro en modo oscuro. Es un archivo externo (no inline) porque la CSP de la
// SPA solo permite scripts propios (script-src 'self').
// Debe coincidir con STORAGE_KEY y la lógica de src/contexts/ThemeContext.tsx.
;(function () {
  try {
    // Migra la preferencia guardada con la clave anterior al cambio de nombre (AgendaSalud).
    var viejo = localStorage.getItem("agendasalud-theme")
    if (viejo !== null) {
      if (localStorage.getItem("agenlu-theme") === null) localStorage.setItem("agenlu-theme", viejo)
      localStorage.removeItem("agendasalud-theme")
    }
    var t = localStorage.getItem("agenlu-theme")
    var dark =
      t === "dark" ||
      ((t === null || t === "system") &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    document.documentElement.classList.toggle("dark", dark)
    document.documentElement.style.colorScheme = dark ? "dark" : "light"
  } catch (e) {
    /* sin localStorage: queda el tema claro por defecto */
  }
})()
