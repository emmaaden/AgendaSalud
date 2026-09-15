import { Button } from "@/components/ui/button"

function App() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 bg-background text-foreground">
      <h1 className="text-3xl font-bold">AgendaSalud</h1>
      <p className="text-muted-foreground">
        React + Vite + TypeScript + Tailwind CSS v4 + shadcn/ui
      </p>
      <Button>Comenzar</Button>
    </main>
  )
}

export default App
