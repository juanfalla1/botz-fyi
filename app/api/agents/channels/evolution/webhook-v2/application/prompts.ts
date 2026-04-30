export function buildEquipmentMenuPrompt(): string {
  return [
    "¿En qué equipo estás interesado?",
    "1) Balanza",
    "2) Báscula",
    "3) Pesas patrón",
    "4) Analizadores de humedad",
    "5) Agitadores orbitales",
    "6) Planchas de calentamiento y agitación",
    "7) Centrífugas",
    "8) Electroquímica (pHmetro, conductivímetro, multiparámetro y electrodos)",
    "9) Otros",
  ].join("\n");
}

export function buildBalanzaQualificationPrompt(): string {
  return "¿Qué capacidad y resolución requiere la balanza y qué tipo de muestras va a pesar?";
}

export function buildNewCustomerDataPrompt(): string {
  return [
    "Para generar tu cotización es necesario registrar tus datos en nuestra plataforma.",
    "Compárteme en un solo mensaje:",
    "- Departamento/ciudad",
    "- Tipo de cliente (Persona natural o Empresa)",
    "- Empresa (si aplica)",
    "- Documento (cédula o NIT, solo números, sin puntos, comas ni guiones)",
    "- Nombre de Contacto",
    "- Correo",
    "- Celular",
    "",
    "⚠️ Si no contamos con esta información, no podremos continuar con el proceso.",
  ].join("\n");
}

export function buildExistingClientLookupPrompt(): string {
  return [
    "Perfecto. Para validar que ya eres cliente de Avanza, compárteme uno de estos datos:",
    "- NIT de la empresa",
    "- Celular registrado",
    "",
    "Puedes enviarlo en un solo mensaje (ej: NIT 900505419 o celular 3131657711).",
  ].join("\n");
}
