function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function inferSpecProcessLabel(args: {
  row: any;
  familyLabelFromRow: (row: any) => string;
  extractRowTechnicalSpec: (row: any) => { capacityG: number; readabilityG: number };
}): string {
  const txt = normalizeText(`${String(args.row?.name || "")} ${String(args.row?.category || "")} ${args.familyLabelFromRow(args.row)}`);
  const spec = args.extractRowTechnicalSpec(args.row);
  const cap = Number(spec.capacityG || 0);
  const read = Number(spec.readabilityG || 0);

  if (/(industrial|plataforma|ranger|defender|valor|rc31|r71|conteo|portatil|portatil|kg\b)/.test(txt) || cap >= 15000) {
    return "Proceso industrial / conteo";
  }
  if (/(oro|joyeria|joyeria|quilat|kilat)/.test(txt) || (read > 0 && read <= 0.01 && cap > 0 && cap <= 6000)) {
    return "Joyería / metales preciosos";
  }
  if (/(laboratorio|analitica|semi|cabina|precision|farmacia|control de calidad)/.test(txt) || (read > 0 && read <= 0.001)) {
    return "Laboratorio / precisión";
  }
  return "Proceso general de pesaje";
}

export function buildGroupedSpecReplyNoContext(args: {
  specQuery: string;
  options: Array<{ code: string; id: string; name: string }>;
  sourceRows: any[];
  priceLine?: string;
  inferSpecProcessLabel: (row: any) => string;
}): string {
  const allOptions = Array.isArray(args.options) ? args.options : [];
  const rows = Array.isArray(args.sourceRows) ? args.sourceRows : [];
  const byId = new Map<string, any>();
  for (const r of rows) {
    const id = String(r?.id || "").trim();
    if (!id || byId.has(id)) continue;
    byId.set(id, r);
  }

  const groups = new Map<string, Array<{ code: string; name: string }>>();
  for (const opt of allOptions) {
    const row = byId.get(String(opt?.id || "").trim());
    const label = args.inferSpecProcessLabel(row);
    const prev = groups.get(label) || [];
    prev.push({ code: String(opt?.code || ""), name: String(opt?.name || "") });
    groups.set(label, prev);
  }

  const orderedGroups = Array.from(groups.entries()).sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  const groupLines = orderedGroups.flatMap(([label, list]) => {
    const head = `${label}: ${list.length} referencia(s)`;
    const preview = list.slice(0, 3).map((x) => `${x.code}) ${x.name}`);
    return [head, ...preview, ""];
  });

  return [
    `Para ${args.specQuery} encontré ${allOptions.length} referencia(s) compatibles en base de datos.`,
    "Como no me indicaste el proceso de uso, te las agrupo por tipo de aplicación (pueden servir para usos distintos):",
    ...(args.priceLine ? [args.priceLine] : []),
    ...groupLines,
    "Indícame tu proceso (laboratorio, joyería u operación industrial) y te dejo solo el grupo correcto.",
    "También puedes elegir un número (A/1) o escribir 'más' para ver el resto.",
  ].join("\n");
}
