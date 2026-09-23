import { Link } from "react-router-dom"
import { HeartPulse } from "lucide-react"
import { cn } from "cn"

export function Logo({
  className,
  to = "/",
}: {
  className?: string
  to?: string
}) {
  return (
    <Link
      to={to}
      className={cn(
        "inline-flex items-center gap-2 font-heading text-lg font-semibold tracking-tight text-foreground",
        className
      )}
    >
      <span className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <HeartPulse className="size-5" />
      </span>
      <span>
        Agenda<span className="text-primary">Salud</span>
      </span>
    </Link>
  )
}
