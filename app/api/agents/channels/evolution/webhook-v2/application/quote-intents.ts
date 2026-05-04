function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function isQuoteProceedIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(damela|damela|enviamela|enviamela|hazla|generala|generala|cotizala|cotizala|adelante|si por favor|si, por favor|dale|de una)/.test(t);
}

export function isQuoteResumeIntent(text: string): boolean {
  const t = normalizeText(String(text || ""));
  if (!t) return false;
  return /(retom|reanuda|continu|seguimos|sigamos|donde\s+ibamos|donde\s+quedamos)/.test(t) && /(cotiz|propuesta|precio|pdf|eso)/.test(t);
}

export function isQuantityUpdateIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(\d{1,5})\s*(unidad|unidades|equipos?)/.test(t) && /(te pedi|te pedi|corrige|actualiza|ajusta|son|quiero|necesito)/.test(t);
}

export function isQuoteRecallIntent(text: string): boolean {
  const t = normalizeText(text);
  return (
    /recuerd|ultima cotizacion|cotizacion que me enviaste|cotizacion anterior|mi cotizacion|mi ultima cotizacion|donde esta la cotizacion|donde va la cotizacion|estado de la cotizacion|aun no me envias|aun no envias|no me has enviado|sigue pendiente la cotizacion/.test(t) &&
    /(cotiz|pdf|enviaste|anterior|ultima|recordar|recuerd)/.test(t)
  );
}

export function isPriceIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(precio|precios|con precio|tienen precio|productos con precio|cuanto vale|cuanto cuest|valor|valen|cuestan)/.test(t);
}

export function isMultiProductQuoteIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(los\s*3|los\s*tres|todos\s+los\s+productos|todos\s+los\s+que\s+tienen\s+precio|de\s+los\s+3|dos\s+mas|tres\s+mas|agrega|agregar|incluye|incluir|suma|sumar|adiciona|adicionar|misma\s+cotizacion|misma\s+cotizacion)/.test(t);
}

export function isSameQuoteContinuationIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(misma\s+cotizacion|misma\s+cotizacion|en\s+la\s+misma\s+cotizacion|en\s+la\s+misma\s+cotizacion|agrega|agregar|incluye|incluir|suma|sumar|adiciona|adicionar|dos\s+mas|tres\s+mas)/.test(t);
}

export function shouldResendPdf(text: string): boolean {
  const t = normalizeText(text);
  return /(reenviar|reenvia|reenvie|volver a enviar|mandame otra vez|otra vez el pdf|reenvio|enviala por aqui|mandala por aqui|dame por aqui|pasala por aqui|donde esta la cotizacion|donde va la cotizacion|estado de la cotizacion|no la veo|no llego el pdf|no me llego el pdf|aun no llega el pdf)/.test(t);
}

export function isInventoryInfoIntent(text: string): boolean {
  const t = normalizeText(text);
  if (isPriceIntent(t)) return false;
  return (
    /(cuantos|cuantas|numero de|cantidad de).*(productos|equipos|referencias|items)/.test(t) ||
    /(catalogo|inventario).*(productos|equipos|referencias)/.test(t) ||
    /(que|cuales).*(productos|prodcutos|equipos).*(tienen|manejan|venden|ofrecen)/.test(t) ||
    /(productos|prodcutos|producto|prodcuto|equipos|equipo).*(tienen|tiene|manejan|maneja|venden|vende|ofrecen|ofrece)/.test(t) ||
    /(que mas producto|que mas productos|que otros productos|que otras referencias|que mas tienes|que otro tienes)/.test(t) ||
    /(tiene|tienen|tinen|hay).*(balanza|balanzas|blanza|blanzas|bascula|basculas|bscula|bsculas)/.test(t)
  );
}

export function isRecommendationIntent(text: string): boolean {
  const t = normalizeText(text);
  return /(recomiend|que me puedes recomendar|que me recomiendas|modelo ideal|que modelo|cual modelo|no se que modelo|no se cual|me sirve|para mi caso|que balanza|tipo de balanza|tipos de balanzas|clase de balanza|sugerencia|busco\s+(una\s+)?balanza|necesito\s+(una\s+)?balanza|gramera|ley\s+de\s+oro|quilat|kilat|joyeria|control\s+de\s+calidad|laboratorio|pesar\s+(cosas|objetos|elementos|articulos|partes|piezas|materiales)\s+(grande|grandes|pesad|muy\s+pesad|de\s+mucho|alto\s+peso|gran\s+capacidad|pequen|livian|ligero|chic|peq)|necesito\s+pesar\s+(mucho|bastante|grandes|pesad|pequeno|pequen|poco|poca|livian|ligero|cosas)|alta\s+capacidad|gran\s+capacidad|mayor\s+capacidad|mas\s+capacidad|baja\s+capacidad|menor\s+capacidad|poca\s+capacidad|pequena\s+capacidad|objetos\s+(pequeno|pequena|chico|livian|ligero)|cosas\s+(pequena|pequeno|chica|liviana|ligera|diminuta))/.test(t);
}

export function isUseCaseApplicabilityIntent(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return (
    /(sirve\s+para|me\s+sirve\s+para|funciona\s+para|aplica\s+para|se\s+puede\s+usar\s+para|puede\s+pesar|pesa\s+\w+|pesar\s+\w+)/.test(t) ||
    (/(tornillo|tornillos|tuerca|tuercas|perno|pernos|maquina|maquinas|equipo|equipos|pieza|piezas|muestra|muestras)/.test(t) && /(producto|modelo|balanza|bascula|este|esta)/.test(t))
  );
}

export function isUseCaseFamilyHint(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  return /(joyeria|joyeria|oro|ley\s+de\s+oro|quilat|kilat|gramera|laboratorio|farmacia|industrial|produccion|produccion|bodega|maquina|maquina|control\s+de\s+calidad|formulacion|formulacion)/.test(t);
}

export function isOutOfCatalogDomainQuery(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  const outTerms = /(tornillo|tornillos|herramienta|herramientas|taladro|martillo|llave inglesa|destornillador|broca|ferreteria|ferreteria|tuerca|perno|clavo|soldadura|silicona|pintura|tenedor|tenedores|cuchillo|cuchillos|cuchara|cucharas|plato|platos|vaso|vasos|carro|carros|vehiculo|vehiculos)/.test(t);
  if (!outTerms) return false;
  const inDomain = /(balanza|balanzas|bascula|basculas|ohaus|analitica|precision|trm|cotizacion|ficha tecnica|humedad|electroquimica|laboratorio|centrifuga|mezclador|agitador|modelo|producto|referencia|sirve para|me sirve|puede pesar|pesar)/.test(t);
  return outTerms && !inDomain;
}

export function isUnsupportedSpecificAnalyzerRequest(text: string): boolean {
  const t = normalizeText(text || "");
  if (!t) return false;
  const asksMoistureAnalyzer = /(anali[sz]ador(?:es)?|humedad)/.test(t);
  if (!asksMoistureAnalyzer) return false;
  return /(fibra\s+de\s+carbono|fibra\s+de\s+carbon|carbon\s+fiber|carbono\s+composito|compuesto\s+de\s+carbono)/.test(t);
}

export function hasCarbonAnalyzerMatch(rows: any[]): boolean {
  const list = Array.isArray(rows) ? rows : [];
  return list.some((row: any) => {
    const source = row?.source_payload && typeof row.source_payload === "object" ? row.source_payload : {};
    const hay = normalizeText([
      String(row?.name || ""),
      String(row?.summary || ""),
      String(row?.description || ""),
      String(row?.specs_text || ""),
      JSON.stringify(source || {}),
    ].join(" "));
    return /(fibra\s+de\s+carbono|fibra\s+de\s+carbon|carbon\s+fiber|carbono\s+composito|compuesto\s+de\s+carbono)/.test(hay);
  });
}
