import { Link } from "react-router-dom"
import { ArrowLeft } from "lucide-react"
import { Container, PageHero } from "@/components/site/Section"
import { CONTACT_EMAIL } from "@/lib/site"

export type LegalSection = { title: string; body: React.ReactNode }

export function LegalArticle({
  title,
  intro,
  sections,
  updated = "2024",
}: {
  title: string
  intro: string
  sections: LegalSection[]
  updated?: string
}) {
  return (
    <>
      <PageHero eyebrow="Legal" title={title} />
      <Container className="py-12">
        <article className="mx-auto max-w-2xl">
          <p className="text-muted-foreground">{intro}</p>

          <div className="mt-8 space-y-8">
            {sections.map((s) => (
              <section key={s.title}>
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <div className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </div>
              </section>
            ))}

            <section>
              <h2 className="text-lg font-semibold">Contacto</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Si tenés alguna pregunta, escribinos a{" "}
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="font-medium text-primary hover:underline"
                >
                  {CONTACT_EMAIL}
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-10 flex items-center justify-between border-t border-border pt-6 text-sm">
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
