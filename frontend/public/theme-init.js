// Aplica el tema guardado antes del primer pintado, para evitar un destello
// claro en modo oscuro. Es un archivo externo (no inline) porque la CSP de la
// SPA solo permite scripts propios (script-src 'self').
// Debe coincidir con STORAGE_KEY y la lógica de src/contexts/ThemeContext.tsx.
;(function () {
  try {
    var t = localStorage.getItem("agendasalud-theme")
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
