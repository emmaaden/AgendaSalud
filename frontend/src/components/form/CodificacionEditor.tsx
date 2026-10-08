import { useEffect, useState } from "react"
import { Plus, Star, X, ShieldAlert, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SelectField } from "@/components/form/SelectField"
import { api } from "@/lib/api"
import { useAuth } from "@/contexts/AuthContext"
import { tieneFeature } from "@/lib/planes"
import {
  useCie10,
  usePracticas,
  type AutorizacionVigente,
  type Codificacion,
} from "@/lib/catalogos"

const SIN_AUTORIZACION = "sin"

/**
 * Fase K: codificación de una consulta — diagnósticos CIE-10 (uno principal) y
 * prácticas del catálogo de la clínica. Si una práctica requiere autorización previa,
 * permite vincular una aprobada y vigente del paciente (`dni`).
 */
export function CodificacionEditor({
  value,
  onChange,
  dni,
}: {
  value: Codificacion
  onChange: (c: Codificacion) => void
  /** DNI del paciente (si ya existe) para ofrecer sus autorizaciones vigentes. */
  dni?: string
}) {
  const { datos: cie10 } = useCie10()
  const { datos: practicas, cargando: cargandoPracticas } = usePracticas()
  const [vigentes, setVigentes] = useState<AutorizacionVigente[]>([])
  // Fase L: sin autorizaciones previas en el plan no hay vigentes que ofrecer.
  const { user } = useAuth()
  const conAutorizaciones = tieneFeature(user?.plan, "autorizaciones")
  const [abiertoDx, setAbiertoDx] = useState(false)
  const [abiertoPx, setAbiertoPx] = useState(false)

  useEffect(() => {
    if (!dni || !conAutorizaciones) return
    let vivo = true
    api
      .get<{ autorizaciones: AutorizacionVigente[] }>(
        `/autorizaciones/vigentes?dni=${encodeURIComponent(dni)}`
      )
      .then((d) => vivo && setVigentes(d.autorizaciones || []))
      .catch(() => {})
    return () => {
      vivo = false
    }
  }, [dni, conAutorizaciones])

  const descDx = new Map(cie10.map((c) => [c.codigo, c.descripcion]))
  const porId = new Map(practicas.map((p) => [p.id, p]))

  // CIE-10 agrupado por categoría (las de 3 caracteres son el título); los códigos
  // sueltos (sin su categoría en el catálogo) van a "Otros".
  const grupos: { clave: string; titulo: string; items: typeof cie10 }[] = []
  const otros: typeof cie10 = []
  for (const c of cie10) {
    const ultimo = grupos[grupos.length - 1]
    if (c.categoria) grupos.push({ clave: c.codigo, titulo: `${c.codigo} · ${c.descripcion}`, items: [] })
    else if (ultimo && c.codigo.startsWith(`${ultimo.clave}.`)) ultimo.items.push(c)
    else otros.push(c)
  }
  if (otros.length) grupos.push({ clave: "otros", titulo: "Otros", items: otros })

  function agregarDx(codigo: string) {
    setAbiertoDx(false)
    if (value.diagnosticos.some((d) => d.codigo === codigo)) return
    onChange({
      ...value,
      diagnosticos: [
        ...value.diagnosticos,
        { codigo, principal: value.diagnosticos.length === 0 },
      ],
    })
  }

  function quitarDx(codigo: string) {
    const resto = value.diagnosticos.filter((d) => d.codigo !== codigo)
    if (resto.length && !resto.some((d) => d.principal)) resto[0] = { ...resto[0], principal: true }
    onChange({ ...value, diagnosticos: resto })
  }

  function principalDx(codigo: string) {
    onChange({
      ...value,
      diagnosticos: value.diagnosticos.map((d) => ({ ...d, principal: d.codigo === codigo })),
    })
  }

  function agregarPx(idPractica: number) {
    setAbiertoPx(false)
    const aut = vigentes.find((a) => a.idPractica === idPractica)
    onChange({
      ...value,
      practicas: [
        ...value.practicas,
        {
          key: `${idPractica}-${Date.now()}`,
          idPractica,
          pieza: aut?.pieza || "",
          cantidad: 1,
          idAutorizacion: porId.get(idPractica)?.requiereAutorizacion ? (aut?.id ?? null) : null,
        },
      ],
    })
  }

  function setPx(key: string, patch: Partial<Codificacion["practicas"][number]>) {
    onChange({
      ...value,
      practicas: value.practicas.map((p) => (p.key === key ? { ...p, ...patch } : p)),
    })
  }

  return (
    <div className="grid gap-5">
      {/* Diagnósticos */}
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Diagnósticos (CIE-10)</Label>
          <Popover open={abiertoDx} onOpenChange={setAbiertoDx}>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm">
                <Plus /> Agregar diagnóstico
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 sm:w-96" align="end">
              <Command>
                <CommandInput placeholder="Buscar por código o descripción…" />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  {grupos.map((g) => (
                    <CommandGroup key={g.clave} heading={g.titulo}>
                      {g.items.map((c) => (
                        <CommandItem
                          key={c.codigo}
                          value={`${c.codigo} ${c.descripcion}`}
                          onSelect={() => agregarDx(c.codigo)}
                        >
                          <span className="font-mono text-xs text-muted-foreground">{c.codigo}</span>
                          <span>{c.descripcion}</span>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  ))}
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {value.diagnosticos.length === 0 ? (
          <p className="text-sm text-muted-foreground">Sin diagnósticos codificados.</p>
        ) : (
          <ul className="grid gap-2">
            {value.diagnosticos.map((d) => (
              <li
                key={d.codigo}
                className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="font-mono text-xs">{d.codigo}</span>
                <span className="min-w-0 flex-1 truncate">{descDx.get(d.codigo) || ""}</span>
                {d.principal ? (
                  <Badge variant="secondary">Principal</Badge>
                ) : (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => principalDx(d.codigo)}
                    title="Marcar como principal"
                  >
                    <Star /> Principal
                  </Button>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => quitarDx(d.codigo)}
                  aria-label={`Quitar ${d.codigo}`}
                >
                  <X />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Prácticas */}
      <div className="grid gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>Prácticas realizadas</Label>
          <Popover open={abiertoPx} onOpenChange={setAbiertoPx}>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={cargandoPracticas || practicas.length === 0}
              >
                <Plus /> Agregar práctica
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80 p-0 sm:w-96" align="end">
              <Command>
                <CommandInput placeholder="Buscar práctica…" />
                <CommandList>
                  <CommandEmpty>Sin resultados.</CommandEmpty>
                  <CommandGroup>
                    {practicas.map((p) => (
                      <CommandItem
                        key={p.id}
                        value={`${p.codigo} ${p.descripcion}`}
                        onSelect={() => agregarPx(p.id)}
                      >
                        <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
                        <span className="flex-1">{p.descripcion}</span>
                        {p.requiereAutorizacion && <ShieldAlert className="text-muted-foreground" />}
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        </div>
        {!cargandoPracticas && practicas.length === 0 && (
          <p className="text-sm text-muted-foreground">
            La clínica todavía no cargó su catálogo de prácticas (Administración).
          </p>
        )}
        {value.practicas.length > 0 && (
          <ul className="grid gap-2">
            {value.practicas.map((sel) => {
              const p = porId.get(sel.idPractica)
              if (!p) return null
              const opcionesAut = vigentes.filter((a) => a.idPractica === p.id)
              return (
                <li key={sel.key} className="grid gap-2 rounded-lg border border-border p-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs">{p.codigo}</span>
                    <span className="min-w-0 flex-1">{p.descripcion}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        onChange({
                          ...value,
                          practicas: value.practicas.filter((x) => x.key !== sel.key),
                        })
                      }
                      aria-label={`Quitar ${p.codigo}`}
                    >
                      <X />
                    </Button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-4">
                    <Input
                      className="sm:col-span-3"
                      placeholder="Pieza o zona (opcional)"
                      value={sel.pieza}
                      onChange={(e) => setPx(sel.key, { pieza: e.target.value })}
                      maxLength={40}
                      aria-label="Pieza o zona"
                    />
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={sel.cantidad}
                      onChange={(e) =>
                        setPx(sel.key, {
                          cantidad: Math.min(99, Math.max(1, Number(e.target.value) || 1)),
                        })
                      }
                      aria-label="Cantidad"
                    />
                  </div>
                  {p.requiereAutorizacion &&
                    (opcionesAut.length > 0 ? (
                      <SelectField
                        value={sel.idAutorizacion ? String(sel.idAutorizacion) : SIN_AUTORIZACION}
                        onValueChange={(v) =>
                          setPx(sel.key, { idAutorizacion: v === SIN_AUTORIZACION ? null : Number(v) })
                        }
                        options={[
                          { value: SIN_AUTORIZACION, label: "Sin autorización" },
                          ...opcionesAut.map((a) => ({
                            value: String(a.id),
                            label: `${a.numero ?? `#${a.id}`}${a.pieza ? ` · pieza ${a.pieza}` : ""}`,
                          })),
                        ]}
                      />
                    ) : (
                      <p className="flex items-center gap-1.5 text-xs text-destructive">
                        <ShieldAlert className="size-3.5" /> Requiere autorización previa y el
                        paciente no tiene una aprobada y vigente.
                      </p>
                    ))}
                  {p.requiereAutorizacion && sel.idAutorizacion && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <ShieldCheck className="size-3.5" /> Vinculada a una autorización aprobada.
                    </p>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

/** Vista de solo lectura de la codificación de un registro guardado. */
export function CodificacionResumen({
  diagnosticos = [],
  practicas = [],
}: {
  diagnosticos?: { codigo: string; descripcion: string; principal: boolean }[]
  practicas?: {
    codigo: string
    descripcion: string
    pieza: string | null
    cantidad: number
    autorizacion: string | null
    requiereAutorizacion: boolean
  }[]
}) {
  if (!diagnosticos.length && !practicas.length) return null
  return (
    <div className="grid gap-2 text-sm">
      {diagnosticos.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {diagnosticos.map((d) => (
            <Badge key={d.codigo} variant={d.principal ? "secondary" : "outline"} title={d.descripcion}>
              {d.codigo} · {d.descripcion}
            </Badge>
          ))}
        </div>
      )}
      {practicas.length > 0 && (
        <ul className="grid gap-1">
          {practicas.map((p, i) => (
            <li key={`${p.codigo}-${i}`} className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="font-mono text-xs text-muted-foreground">{p.codigo}</span>
              <span>
                {p.descripcion}
                {p.pieza ? ` · pieza ${p.pieza}` : ""}
                {p.cantidad > 1 ? ` · ×${p.cantidad}` : ""}
              </span>
              {p.autorizacion ? (
                <Badge variant="outline">
                  <ShieldCheck /> {p.autorizacion}
                </Badge>
              ) : (
                p.requiereAutorizacion && (
                  <Badge variant="destructive">
                    <ShieldAlert /> Sin autorización
                  </Badge>
                )
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
