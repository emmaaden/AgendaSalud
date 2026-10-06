import { LegalArticle } from "@/components/site/LegalArticle"
import { CONTACT_EMAIL, LEGAL_UPDATED } from "@/lib/site"

const LINK = "font-medium text-primary underline-offset-2 hover:underline"

export default function Accesibilidad() {
  return (
    <LegalArticle
      updated={LEGAL_UPDATED}
      title="Accesibilidad"
      intro={
        <p>
          Queremos que cualquier persona pueda pedir un turno y consultar su
          información, use o no tecnologías de apoyo. Tomamos como referencia las
          Pautas de Accesibilidad para el Contenido Web (WCAG) del W3C, nivel AA, en
          las que se basa la Ley 26.653 de Accesibilidad Web.
        </p>
      }
      sections={[
        {
          title: "Qué hicimos",
          body: (
            <ul>
              <li>Los formularios públicos (registro, reserva de turnos, solicitudes) se pueden completar solo con teclado, con el foco visible.</li>
              <li>Un enlace «Saltar al contenido» al comienzo de cada página.</li>
              <li>Colores de texto con contraste mínimo de 4,5:1 y bordes de campos de 3:1, en tema claro y oscuro.</li>
              <li>Campos de formulario con etiqueta; los obligatorios y los errores se anuncian a lectores de pantalla.</li>
              <li>Cada página tiene su propio título y la estructura de encabezados es ordenada.</li>
              <li>Se respeta la preferencia del sistema de reducir el movimiento.</li>
            </ul>
          ),
        },
        {
          title: "Limitaciones conocidas",
          body: (
            <p>
              En el panel profesional, mover un turno arrastrándolo en el calendario
              requiere mouse o pantalla táctil; con teclado se puede hacer lo mismo
              desde el detalle del turno, con «Reprogramar». El odontograma se puede
              operar con teclado, aunque es una herramienta visual que seguimos
              mejorando para lectores de pantalla.
            </p>
          ),
        },
        {
          title: "¿Encontraste una barrera?",
          body: (
            <p>
              Escribinos a{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className={LINK}>
                {CONTACT_EMAIL}
              </a>{" "}
              contándonos en qué página y qué pasó. Te ayudamos a completar el trámite
              por otro medio mientras lo resolvemos.
            </p>
          ),
        },
      ]}
    />
  )
}
