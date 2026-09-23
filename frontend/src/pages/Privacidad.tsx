import { LegalArticle } from "@/components/site/LegalArticle"

export default function Privacidad() {
  return (
    <LegalArticle
      title="Política de privacidad"
      intro="Nos comprometemos a proteger tu privacidad. Acá te explicamos cómo recopilamos, usamos y protegemos tu información personal."
      sections={[
        {
          title: "Información que recopilamos",
          body: "Recopilamos información personal cuando te registrás en el sitio, hacés una reserva o interactuás con nuestras funciones: nombre, dirección de correo electrónico y número de teléfono.",
        },
        {
          title: "Uso de la información",
          body: "La información se utiliza para procesar tus turnos, brindarte soporte y mejorar nuestros servicios. No compartimos ni vendemos tu información a terceros, salvo cuando sea necesario para completar una transacción.",
        },
        {
          title: "Seguridad",
          body: "Nos esforzamos por proteger tu información con medidas de seguridad adecuadas. Sin embargo, no podemos garantizar la seguridad de la información transmitida a través de Internet.",
        },
        {
          title: "Cookies",
          body: "Utilizamos cookies para mejorar tu experiencia. Podés configurar tu navegador para rechazarlas, aunque algunas partes del sitio podrían no funcionar correctamente.",
        },
      ]}
    />
  )
}
