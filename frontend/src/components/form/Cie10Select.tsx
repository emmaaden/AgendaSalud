import { useState } from "react"
import { ChevronsUpDown, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useCie10 } from "@/lib/catalogos"

/** Fase K: elegir UN diagnóstico CIE-10 del catálogo (buscador por código o texto). */
export function Cie10Select({
  id,
  value,
  onChange,
}: {
  id?: string
  value: string
  onChange: (codigo: string) => void
}) {
  const { datos } = useCie10()
  const [abierto, setAbierto] = useState(false)
  const elegido = datos.find((c) => c.codigo === value)

  return (
    <div className="flex gap-2">
      <Popover open={abierto} onOpenChange={setAbierto}>
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            className="h-10 min-w-0 flex-1 justify-between font-normal"
          >
            <span className="truncate">
              {elegido ? `${elegido.codigo} · ${elegido.descripcion}` : "Elegí un diagnóstico (opcional)"}
            </span>
            <ChevronsUpDown className="text-muted-foreground" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0 sm:w-96" align="start">
          <Command>
            <CommandInput placeholder="Buscar por código o descripción…" />
            <CommandList>
              <CommandEmpty>Sin resultados.</CommandEmpty>
              <CommandGroup>
                {datos
                  .filter((c) => !c.categoria)
                  .map((c) => (
                    <CommandItem
                      key={c.codigo}
                      value={`${c.codigo} ${c.descripcion}`}
                      onSelect={() => {
                        onChange(c.codigo)
                        setAbierto(false)
                      }}
                    >
                      <span className="font-mono text-xs text-muted-foreground">{c.codigo}</span>
                      <span>{c.descripcion}</span>
                    </CommandItem>
                  ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="size-10"
          onClick={() => onChange("")}
          aria-label="Quitar diagnóstico"
        >
          <X />
        </Button>
      )}
    </div>
  )
}
