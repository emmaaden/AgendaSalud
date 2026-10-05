// Lista base de prácticas odontológicas (Fase K). El admin la carga con un clic desde
// Administración y después la edita: el catálogo de prácticas es PROPIO de cada clínica.
// Los códigos son internos ("OD.."), no los de ningún nomenclador oficial: cada clínica
// puede reemplazarlos por los de su convenio (importando un CSV).

module.exports = [
    { codigo: 'OD01', descripcion: 'Consulta y examen odontológico', requiereAutorizacion: false },
    { codigo: 'OD02', descripcion: 'Consulta de urgencia', requiereAutorizacion: false },
    { codigo: 'OD03', descripcion: 'Radiografía periapical', requiereAutorizacion: false },
    { codigo: 'OD04', descripcion: 'Radiografía panorámica', requiereAutorizacion: false },
    { codigo: 'OD05', descripcion: 'Limpieza y tartrectomía', requiereAutorizacion: false },
    { codigo: 'OD06', descripcion: 'Topicación con flúor', requiereAutorizacion: false },
    { codigo: 'OD07', descripcion: 'Sellador de fosas y fisuras (por pieza)', requiereAutorizacion: false },
    { codigo: 'OD08', descripcion: 'Obturación con resina, cavidad simple', requiereAutorizacion: false },
    { codigo: 'OD09', descripcion: 'Obturación con resina, cavidad compuesta', requiereAutorizacion: false },
    { codigo: 'OD10', descripcion: 'Endodoncia unirradicular', requiereAutorizacion: true },
    { codigo: 'OD11', descripcion: 'Endodoncia multirradicular', requiereAutorizacion: true },
    { codigo: 'OD12', descripcion: 'Extracción simple', requiereAutorizacion: false },
    { codigo: 'OD13', descripcion: 'Extracción quirúrgica / pieza retenida', requiereAutorizacion: true },
    { codigo: 'OD14', descripcion: 'Raspaje y alisado radicular (por cuadrante)', requiereAutorizacion: false },
    { codigo: 'OD15', descripcion: 'Corona', requiereAutorizacion: true },
    { codigo: 'OD16', descripcion: 'Prótesis removible', requiereAutorizacion: true },
    { codigo: 'OD17', descripcion: 'Implante dental', requiereAutorizacion: true },
    { codigo: 'OD18', descripcion: 'Ortodoncia: aparatología fija (inicio)', requiereAutorizacion: true },
    { codigo: 'OD19', descripcion: 'Ortodoncia: control mensual', requiereAutorizacion: false },
    { codigo: 'OD20', descripcion: 'Blanqueamiento dental', requiereAutorizacion: false },
];
