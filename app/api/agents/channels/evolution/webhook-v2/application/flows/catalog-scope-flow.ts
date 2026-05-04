export function handleStrictCatalogScopeDisambiguation(args: {
  strictReply: string;
  awaiting: string;
  text: string;
  ownerRows: any[];
  previousMemory: Record<string, any>;
  strictMemory: Record<string, any>;
  normalizeText: (v: string) => string;
  buildNumberedFamilyOptions: (rows: any[], maxItems: number) => any[];
  dedupeOptionSpecSegments: (name: string) => string;
}): { handled: boolean; strictReply: string } {
  let strictReply = String(args.strictReply || "");
  if (String(strictReply || "").trim()) return { handled: false, strictReply };
  if (args.awaiting !== "strict_catalog_scope_disambiguation") return { handled: false, strictReply };

  const t = args.normalizeText(args.text);
  const chooseGlobal = /^\s*(1|a)\s*$/.test(t) || /catalogo\s+completo|todas\s+las\s+categorias|todos\s+los\s+productos/.test(t);
  const chooseCurrent = /^\s*(2|b)\s*$/.test(t) || /solo\s+esta|solo\s+categoria|solo\s+familia|de\s+balanzas|de\s+basculas/.test(t);

  if (chooseGlobal) {
    const families = args.buildNumberedFamilyOptions(args.ownerRows as any[], 10);
    const total = families.reduce((acc: number, f: any) => acc + Number(f?.count || 0), 0);
    args.strictMemory.last_category_intent = "";
    args.strictMemory.strict_family_label = "";
    args.strictMemory.pending_product_options = [];
    args.strictMemory.pending_family_options = families;
    args.strictMemory.strict_model_offset = 0;
    args.strictMemory.awaiting_action = "strict_choose_family";
    strictReply = families.length
      ? [
          `Perfecto. Te muestro el catálogo completo (${total} referencias activas).`,
          "Elige una familia:",
          ...families.map((f: any) => `${f.code}) ${f.label} (${f.count})`),
          "",
          "Responde con letra o número (A/1).",
        ].join("\n")
      : "Ahora mismo no tengo familias activas para mostrarte en catálogo.";
    return { handled: true, strictReply };
  }

  if (chooseCurrent) {
    const pending = (Array.isArray(args.previousMemory?.pending_product_options) ? args.previousMemory.pending_product_options : [])
      .map((o: any) => ({ ...o, name: args.dedupeOptionSpecSegments(String(o?.name || "")) }));
    const familyLabel = String(args.previousMemory?.strict_family_label || "").trim();
    args.strictMemory.awaiting_action = pending.length ? "strict_choose_model" : "strict_choose_family";
    args.strictMemory.pending_product_options = pending;
    args.strictMemory.pending_family_options = Array.isArray(args.previousMemory?.pending_family_options) ? args.previousMemory.pending_family_options : [];
    strictReply = pending.length
      ? [
          `Perfecto, seguimos solo en ${familyLabel || "esta categoría"}.`,
          ...pending.map((o: any) => `${o.code}) ${o.name}`),
          "",
          "Elige con letra o número (A/1), o escribe 'más'.",
        ].join("\n")
      : `Perfecto, seguimos solo en ${familyLabel || "esta categoría"}. Elige una familia con letra o número.`;
    return { handled: true, strictReply };
  }

  args.strictMemory.awaiting_action = "strict_catalog_scope_disambiguation";
  strictReply = "Para evitar ambigüedad, responde: 1) Catálogo completo 2) Solo esta categoría.";
  return { handled: true, strictReply };
}
