import { Suspense, useEffect } from "react"
import { Link, Outlet, useLocation } from "react-router-dom"
import { Navbar } from "@/components/site/Navbar"
import { Footer } from "@/components/site/Footer"
import { PageLoader } from "@/components/site/PageLoader"
import { MAIN_ID, SkipLink } from "@/components/site/A11y"

function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior })
  }, [pathname])
  return null
}

/**
 * Botón de arrepentimiento y botón de baja de servicio (Disp. SSDCyLC 954/2025): deben
 * verse «a simple vista, en lugar destacado y en el primer acceso», sin registración.
 * Por eso van arriba de todo, en todas las páginas públicas.
 */
function BarraConsumidor() {
  return (
    <div className="border-b border-border bg-muted/50 text-xs">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-end gap-x-4 gap-y-1 px-4 py-1.5 sm:px-6">
        <Link
          to="/arrepentimiento"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Botón de arrepentimiento
        </Link>
        <Link
          to="/baja"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Botón de baja de servicio
        </Link>
      </div>
    </div>
  )
}

export function PublicLayout() {
  return (
    <div className="flex min-h-dvh flex-col">
      <SkipLink />
      <ScrollToTop />
      <BarraConsumidor />
      <Navbar />
      <main id={MAIN_ID} tabIndex={-1} className="flex-1 focus:outline-none">
        {/* Suspense acá: mientras carga una página lazy, navbar y footer quedan visibles. */}
        <Suspense fallback={<PageLoader />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  )
}
