import { cn } from "cn"

/** Contenedor de ancho máximo consistente para todas las páginas. */
export function Container({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}
      {...props}
    />
  )
}

/** Encabezado de página interior (título + descripción). */
export function PageHero({
  eyebrow,
  title,
  description,
  className,
}: {
  eyebrow?: string
  title: string
  description?: string
  className?: string
}) {
  return (
    <div className={cn("border-b border-border bg-muted/30", className)}>
      <Container className="py-12 sm:py-16">
        {eyebrow && (
          <p className="mb-2 text-sm font-semibold text-primary">{eyebrow}</p>
        )}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {description && (
          <p className="mt-3 max-w-2xl text-base text-muted-foreground">
            {description}
          </p>
        )}
      </Container>
    </div>
  )
}
