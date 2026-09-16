import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { Loader2, Search, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Field } from "@/components/form/Field"
import { Container, PageHero } from "@/components/site/Section"
import { api, ApiError } from "@/lib/api"

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
]

function meses() {
  const f = new Date()
  return { mesActual: MESES[f.getMonth()], mesProximo: MESES[(f.getMonth() + 1) % 12] }
}

const schema = z.object({ dni: z.string().min(6, "Ingresá un DNI válido") })
type FormValues = z.infer<typeof schema>

type Resultado = {
  nombre: string
  apellido: string
  valor: number
  aumento: number
}

export default function ValorOrtodoncia() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resultado, setResultado] = useState<Resultado | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) })

  async function onSubmit(values: FormValues) {
    setLoading(true)
    setError(null)
    setResultado(null)
    try {
      const data = await api.post<Resultado>("/ortodoncia/get-data", {
        dni: values.dni,
      })
      setResultado(data)
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "No se pudo obtener la información. Verificá el DNI."
      )
    } finally {
      setLoading(false)
    }
  }

  const { mesActual, mesProximo } = meses()
  const valorProximo = resultado
    ? resultado.valor + resultado.valor * (resultado.aumento / 100)
    : 0

  return (
    <>
      <PageHero
        eyebrow="Ortodoncia"
        title="Consultá el valor de tu tratamiento"
        description="Ingresá tu DNI para ver el importe del mes actual y del próximo."
      />

      <Container className="py-12">
        <div className="mx-auto max-w-lg">
          <Card>
            <CardContent className="p-6 sm:p-8">
              <form
                onSubmit={handleSubmit(onSubmit)}
                className="space-y-4"
                noValidate
              >
                <Field
                  label="DNI"
                  htmlFor="dni"
                  required
                  error={errors.dni?.message}
                >
                  <Input
                    id="dni"
                    type="number"
                    inputMode="numeric"
                    className="h-10"
                    placeholder="Ej. 30123456"
                    aria-invalid={!!errors.dni}
                    {...register("dni")}
                  />
                </Field>
                <Button
                  type="submit"
                  size="lg"
                  className="w-full"
                  disabled={loading}
                >
                  {loading ? <Loader2 className="animate-spin" /> : <Search />}
                  Consultar
                </Button>
              </form>
            </CardContent>
          </Card>

          {error && (
            <p className="mt-4 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </p>
          )}

          {resultado && (
            <Card className="mt-6">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 text-primary">
                  <Smile className="size-5" />
                  <h2 className="font-semibold">Resultados</h2>
                </div>

                <div className="mt-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    Paciente
                  </p>
                  <p className="text-lg font-semibold">
                    {resultado.nombre} {resultado.apellido}
                  </p>
                </div>

                <div className="mt-4 space-y-3 border-t border-border pt-4">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{mesActual}</span>
                    <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                      ${resultado.valor.toLocaleString("es-AR")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{mesProximo}</span>
                    <span className="rounded-full bg-muted px-3 py-1 text-sm font-semibold text-foreground">
                      ${valorProximo.toLocaleString("es-AR")} (+
                      {resultado.aumento}%)
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </Container>
    </>
  )
}
