import { LegalArticle } from "@/components/site/LegalArticle"

export default function Terminos() {
  return (
    <LegalArticle
      title="Términos y condiciones"
      intro="Al acceder y utilizar AgendaSalud, aceptás estos términos. Si no estás de acuerdo, por favor no utilices el sitio."
      sections={[
        {
          title: "Uso del sitio",
          body: "El uso de este sitio es solo para fines legales. No podés usarlo para actividades fraudulentas o maliciosas. Nos reservamos el derecho de restringir el acceso a usuarios que violen estos términos.",
        },
        {
          title: "Propiedad intelectual",
          body: "Todo el contenido de este sitio —textos, imágenes y logotipos— es propiedad de AgendaSalud o de sus licenciantes. No podés reproducir, distribuir ni utilizar dicho contenido sin permiso expreso.",
        },
        {
          title: "Limitación de responsabilidad",
          body: "AgendaSalud no se responsabiliza por cualquier daño que pueda resultar del uso del sitio o de la imposibilidad de acceder al mismo.",
        },
        {
          title: "Modificaciones",
          body: "Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios son efectivos al publicarse en esta página. Te recomendamos revisarla periódicamente.",
        },
      ]}
    />
  )
}
