export type FieldDef = {
  name: string;
  required: boolean;
};

export type BlockDef = {
  block: string;
  fields: FieldDef[];
};

export type ModuleFieldCatalog = {
  module: string;
  blocks: BlockDef[];
};

export const CLIENT_FIELD_CATALOG: ModuleFieldCatalog[] = [
  {
    module: "Negocios",
    blocks: [
      {
        block: "Informacion del negocio",
        fields: [
          { name: "Nombre de negocio", required: true },
          { name: "Empresa (si aplica)", required: false },
          { name: "Origen", required: true },
          { name: "Valor", required: false },
          { name: "Asignado a", required: true },
          { name: "Origen del negocio", required: false },
          { name: "Fecha de garantia", required: false },
          { name: "Fase de venta", required: true },
          { name: "Nombre de contacto", required: true },
          { name: "Linea de negocio", required: false },
          { name: "Fecha estimada de cierre", required: true },
          { name: "Comentarios", required: false },
          { name: "Campana origen", required: false },
          { name: "Dias de inactividad", required: false },
        ],
      },
      {
        block: "Meta Ads",
        fields: [
          { name: "Plataforma", required: false },
          { name: "Nombre del formulario", required: false },
          { name: "Campana", required: false },
          { name: "Grupo de anuncios", required: false },
          { name: "Dispositivo", required: false },
          { name: "ID del anuncio", required: false },
          { name: "Nombre del anuncio", required: false },
          { name: "Link anuncio", required: false },
        ],
      },
      { block: "Detalles de la descripcion", fields: [{ name: "Descripcion", required: false }] },
      {
        block: "Informacion especifica",
        fields: [
          { name: "N de negocio", required: false },
          { name: "Fecha de creacion", required: false },
          { name: "Id de RdStation", required: false },
          { name: "URL publica RD Station", required: false },
          { name: "Tiempo de contacto", required: false },
          { name: "Monto total cotizaciones", required: false },
          { name: "Creado por", required: false },
          { name: "Fecha de modificacion", required: false },
          { name: "Identificador Rd Station", required: false },
          { name: "Motivo de perdida", required: false },
          { name: "Monto total pedidos", required: false },
        ],
      },
      {
        block: "Google Adwords",
        fields: [
          { name: "Campana", required: false },
          { name: "Termino", required: false },
          { name: "Posicion", required: false },
          { name: "Gclid", required: false },
          { name: "Grupo", required: false },
          { name: "Red", required: false },
          { name: "Dispositivo", required: false },
        ],
      },
      { block: "Informacion NPS del negocio", fields: [{ name: "URL NPS del negocio", required: false }] },
    ],
  },
  {
    module: "Contactos",
    blocks: [
      {
        block: "Datos personales",
        fields: [
          { name: "Nombre y apellido", required: true },
          { name: "Celular", required: true },
          { name: "Cargo", required: false },
          { name: "Fecha de nacimiento", required: false },
          { name: "Activar Chatbot", required: false },
          { name: "Correo", required: true },
          { name: "Empresa (si aplica)", required: false },
          { name: "Asignado a", required: true },
          { name: "Area", required: false },
          { name: "Chatbot Dapta ID", required: false },
        ],
      },
      {
        block: "Detalles de la direccion",
        fields: [
          { name: "Pais", required: true },
          { name: "Ciudad", required: false },
          { name: "Origen de contacto", required: false },
          { name: "Departamento", required: false },
          { name: "Direccion", required: false },
          { name: "Ciudad Texto", required: false },
        ],
      },
      { block: "Redes Sociales", fields: [{ name: "Facebook", required: false }, { name: "Instagram", required: false }] },
      { block: "Detalles de la descripcion", fields: [] },
      {
        block: "Informacion especifica",
        fields: [
          { name: "Creado por", required: false },
          { name: "Fecha de modificacion", required: false },
          { name: "Cumpleanos", required: false },
          { name: "Id del contacto", required: false },
          { name: "Fecha de creacion", required: false },
        ],
      },
      { block: "Informacion de la empresa", fields: [] },
      { block: "Informacion de foto del contacto", fields: [] },
    ],
  },
  {
    module: "Empresas",
    blocks: [
      {
        block: "Informacion de la empresa",
        fields: [
          { name: "Empresa", required: true },
          { name: "NIT", required: true },
          { name: "Correo", required: false },
          { name: "Origen del cliente", required: false },
          { name: "Porcentaje de descuento", required: false },
          { name: "Importancia", required: true },
          { name: "Actividad del cliente", required: true },
          { name: "Asignado a", required: true },
          { name: "Telefono fijo", required: false },
          { name: "Lista de Precios", required: false },
        ],
      },
      {
        block: "Detalles de la direccion",
        fields: [
          { name: "Pais", required: true },
          { name: "Ciudad", required: false },
          { name: "Departamento", required: true },
          { name: "Direccion", required: true },
        ],
      },
      { block: "Detalles de la descripcion", fields: [] },
      {
        block: "Informacion especifica",
        fields: [
          { name: "Id de Alegra", required: false },
          { name: "Fecha de creacion", required: false },
          { name: "Fecha de modificacion", required: false },
          { name: "ID de RdStation", required: false },
          { name: "N de empresa", required: false },
          { name: "Creado por", required: false },
          { name: "Cumpleanos", required: false },
        ],
      },
      { block: "Negocios recurrentes", fields: [{ name: "Proximo negocio", required: false }, { name: "Contacto de recurrencia", required: false }] },
      {
        block: "Saldos de Cartera",
        fields: [
          { name: "Cartera Corriente", required: false },
          { name: "Estado de Cartera", required: false },
          { name: "Cupo Credito", required: false },
          { name: "Saldo Mora", required: false },
          { name: "Dias de Credito", required: false },
          { name: "Forma de pago", required: false },
        ],
      },
    ],
  },
  {
    module: "Documentos",
    blocks: [
      {
        block: "Informacion basica",
        fields: [
          { name: "Asunto", required: true },
          { name: "N de documento", required: false },
          { name: "Fecha de creacion", required: false },
          { name: "Nombre de carpeta", required: false },
          { name: "Asignado a", required: true },
          { name: "Fecha de modificacion", required: false },
        ],
      },
      { block: "Descripcion", fields: [{ name: "Notas", required: false }] },
      {
        block: "Informacion del archivo",
        fields: [
          { name: "Tipo de descarga", required: false },
          { name: "Nombre del archivo", required: false },
          { name: "Tipo del archivo", required: false },
          { name: "N de descarga", required: false },
          { name: "Activo", required: false },
          { name: "Tamano", required: false },
          { name: "Version", required: false },
          { name: "Tipo de documento", required: false },
        ],
      },
    ],
  },
  {
    module: "Casos",
    blocks: [
      {
        block: "Informacion del caso",
        fields: [
          { name: "Referencia", required: true },
          { name: "Empresa", required: false },
          { name: "Categoria", required: false },
          { name: "Origen", required: false },
          { name: "Descripcion", required: false },
          { name: "Id Work Order Persat", required: false },
          { name: "Estado", required: true },
          { name: "Nombre de contacto", required: false },
          { name: "Sub-categoria", required: false },
          { name: "Asignado a", required: true },
          { name: "Origen Caso", required: false },
          { name: "Activo asociado", required: false },
        ],
      },
      {
        block: "Solucion propuesta",
        fields: [
          { name: "Solucion", required: false },
          { name: "Duracion", required: false },
          { name: "Fecha de cierre", required: false },
        ],
      },
      {
        block: "Informacion especifica",
        fields: [
          { name: "N de caso", required: false },
          { name: "Fecha de modificacion", required: false },
          { name: "Fecha de creacion", required: false },
          { name: "Tipo de mantenimiento", required: false },
        ],
      },
      { block: "Detalles de la descripcion", fields: [] },
      { block: "Calificacion", fields: [] },
    ],
  },
  {
    module: "Productos",
    blocks: [
      {
        block: "Informacion del modelo",
        fields: [
          { name: "Modelo", required: true },
          { name: "Modelo activo", required: false },
          { name: "SAP", required: false },
          { name: "Garantia", required: false },
          { name: "Fecha de modificacion", required: false },
          { name: "Clase de impuesto", required: false },
          { name: "Fecha de creacion", required: false },
          { name: "Referencia", required: false },
          { name: "N de modelo", required: false },
          { name: "Familia", required: false },
          { name: "Instrumento", required: false },
          { name: "Precio unitario", required: false },
          { name: "Descripcion", required: false },
          { name: "Responsable", required: true },
          { name: "Fabricante", required: false },
        ],
      },
      { block: "Informacion de la imagen del modelo", fields: [{ name: "Imagen del Modelo", required: false }, { name: "Enlace", required: false }] },
      { block: "Informacion de precios", fields: [] },
      { block: "Informacion del stock", fields: [] },
      { block: "Informacion especifica", fields: [] },
      { block: "Detalles de la descripcion", fields: [] },
    ],
  },
  {
    module: "Actividades",
    blocks: [
      {
        block: "Detalle de la actividad",
        fields: [
          { name: "Tipo de actividad", required: true },
          { name: "Fecha", required: true },
          { name: "Fecha de finalizacion", required: true },
          { name: "Estado", required: true },
          { name: "Donde", required: false },
          { name: "Fecha de modificacion", required: false },
          { name: "Asunto", required: true },
          { name: "Descripcion", required: false },
          { name: "Asignado por", required: false },
          { name: "Asignado a", required: true },
          { name: "Fecha de creacion", required: false },
          { name: "Visibilidad", required: false },
        ],
      },
      { block: "Detalles del recordatorio", fields: [{ name: "Enviar recordatorio", required: false }] },
      { block: "Detalles de recurrencia", fields: [{ name: "Eventos recurrentes", required: false }] },
      {
        block: "Relacionado con",
        fields: [
          { name: "Empresa", required: false },
          { name: "Relacionado con", required: false },
          { name: "Nombre de contacto", required: false },
        ],
      },
      { block: "Detalles de la descripcion", fields: [] },
      {
        block: "Informacion especifica",
        fields: [
          { name: "Latitud", required: false },
          { name: "Telefono", required: false },
          { name: "Nombre Contacto", required: false },
          { name: "Fase de venta", required: false },
          { name: "Longitud", required: false },
          { name: "Correo", required: false },
          { name: "Celular", required: false },
          { name: "Creado por", required: false },
        ],
      },
      { block: "Invitar", fields: [{ name: "Invitar usuarios", required: false }] },
    ],
  },
  {
    module: "Cotizaciones",
    blocks: [
      {
        block: "Informacion de la cotizacion",
        fields: [
          { name: "Asunto", required: true },
          { name: "Empresa", required: false },
          { name: "Estado de la cotizacion", required: true },
          { name: "Valido hasta", required: false },
          { name: "Fecha de Entrega", required: false },
          { name: "Cartera Corriente", required: false },
          { name: "Estado de Cartera", required: false },
          { name: "Nombre de contacto", required: false },
          { name: "Negocio", required: false },
          { name: "Asignado a", required: true },
          { name: "Precio unitario", required: false },
          { name: "Porcentaje de descuento", required: false },
          { name: "Saldo Mora", required: false },
          { name: "Anexar fichas tecnicas", required: false },
        ],
      },
      {
        block: "Detalles de la descripcion",
        fields: [
          { name: "Descripcion", required: false },
          { name: "Forma de pago", required: false },
        ],
      },
      { block: "Terminos y condiciones", fields: [] },
      {
        block: "Detalles de la direccion",
        fields: [
          { name: "Direccion", required: false },
          { name: "Pais", required: false },
          { name: "Ciudad", required: false },
        ],
      },
      {
        block: "Informacion especifica",
        fields: [
          { name: "N de cotizacion", required: false },
          { name: "Fecha de creacion", required: false },
          { name: "Id de cotizacion en Alegra", required: false },
          { name: "Fecha de modificacion", required: false },
        ],
      },
      { block: "Detalles del producto", fields: [] },
    ],
  },
];
