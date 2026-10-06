import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Container, PageHero } from "@/components/site/Section"
import { BUSINESS, CONTACT_EMAIL, datoNegocio } from "@/lib/site"

export type LegalSection = { title: string; body: React.ReactNode }

/** Datos de identificación del titular (Ley 24.240 art. 4 / Ley 25.326 art. 6). */
export function DatosTitular() {
  return (
    <dl className="grid gap-x-4 gap-y-1 sm:grid-cols-[auto_1fr]">
      <dt className="font-medium text-foreground">Servicio</dt>
      <dd>{BUSINESS.marca}</dd>
      <dt className="font-medium text-foreground">Titular</dt>
      <dd>{BUSINESS.titular}</dd>
      <dt className="font-medium text-foreground">CUIT</dt>
      <dd>{datoNegocio(BUSINESS.cuit)}</dd>
      <dt className="font-medium text-foreground">Domicilio</dt>
      <dd>{datoNegocio(BUSINESS.domicilio)}</dd>
      <dt className="font-medium text-foreground">Email</dt>
      <dd>
        <a href={`mailto:${BUSINESS.email}`} className="text-primary underline-offset-2 hover:underline">
          {BUSINESS.email}
        </a>
      </dd>
      <dt className="font-medium text-foreground">Teléfono / WhatsApp</dt>
      <dd>{BUSINESS.telefono}</dd>
    </dl>
  )
}

export function LegalArticle({
  title,
  intro,
  sections,
  updated,
}: {
  title: string
  intro: React.ReactNode
  sections: LegalSection[]
  /** Obligatorio a propósito: sin valor por defecto no puede quedar una fecha vieja al pie. */
  updated: string
}) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} />
      <Container className="py-12">
        <article className="mx-auto max-w-2xl">
          <div className="text-muted-foreground">{intro}</div>

          <div className="mt-8 space-y-8">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground [&_li]:mt-1 [&_ul]:list-disc [&_ul]:pl-5">
                  {s.body}
                </div>
              </section>
            ))}

            <section>
              <h2 className="text-lg font-semibold">Titular y contacto</h2>
              <div className="mt-2 space-y-3 text-sm leading-relaxed text-muted-foreground">
                <DatosTitular />
                <p>
                  Si tenés alguna pregunta, escribinos a{" "}
                  <a
                    href={`mailto:${CONTACT_EMAIL}`}
                    className="font-medium text-primary hover:underline"
                  >
                    {CONTACT_EMAIL}
                  </a>
                  .
                </p>
              </div>
            </section>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-6 text-sm">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 font-medium text-primary hover:underline"
            >
              <ArrowLeft className="size-4" /> Volver al inicio
            </Link>
            <span className="text-muted-foreground">
              Última actualización: {updated}
            </span>
          </div>
        </article>
      </Container>
    </>
  )
}
