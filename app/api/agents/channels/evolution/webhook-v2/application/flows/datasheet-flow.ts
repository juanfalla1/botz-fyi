export async function handleStrictDatasheetRequest(args: {
  strictReply: string;
  wantsSheet: boolean;
  textNorm: string;
  text: string;
  previousMemory: Record<string, any>;
  ownerRows: any[];
  selectedProduct: any;
  selectedName: string;
  strictDocs: Array<{ base64: string; fileName: string; mimetype: string; caption?: string }>;
  strictMemory: Record<string, any>;
  maxWhatsappDocBytes: number;
  extractBundleOptionIndexes: (text: string) => number[];
  findCatalogProductByName: (rows: any[], name: string) => any;
  pickBestProductPdfUrl: (row: any, text: string) => string;
  pickBestLocalPdfPath: (row: any, text: string) => string;
  fetchRemoteFileAsBase64: (url: string) => Promise<any>;
  fetchLocalFileAsBase64: (localPath: string) => any;
  safeFileName: (name: string, fallbackBase: string, ext: string) => string;
  buildTechnicalSummary: (row: any, maxLines?: number) => string;
}): Promise<{ handled: boolean; strictReply: string }> {
  let strictReply = String(args.strictReply || "");
  if (String(strictReply || "").trim()) return { handled: false, strictReply };
  if (!(args.wantsSheet || /^2\b/.test(args.textNorm))) return { handled: false, strictReply };

  const appendSheetFromRow = async (row: any, modelLabel: string): Promise<boolean> => {
    const datasheetUrl = args.pickBestProductPdfUrl(row, args.text) || "";
    const localPdfPath = args.pickBestLocalPdfPath(row, args.text);
    if (datasheetUrl) {
      const remote = await args.fetchRemoteFileAsBase64(datasheetUrl);
      const remoteLooksPdf = Boolean(remote) && (/application\/pdf/i.test(String(remote?.mimetype || "")) || /\.pdf(\?|$)/i.test(datasheetUrl));
      if (remote && remoteLooksPdf && Number(remote.byteSize || 0) <= args.maxWhatsappDocBytes) {
        args.strictDocs.push({
          base64: remote.base64,
          fileName: args.safeFileName(remote.fileName, `ficha-${modelLabel}`, "pdf"),
          mimetype: "application/pdf",
          caption: `Ficha técnica - ${modelLabel}`,
        });
        return true;
      }
    }
    if (localPdfPath) {
      const local = args.fetchLocalFileAsBase64(localPdfPath);
      if (local && Number(local.byteSize || 0) <= args.maxWhatsappDocBytes) {
        args.strictDocs.push({
          base64: local.base64,
          fileName: args.safeFileName(local.fileName, `ficha-${modelLabel}`, "pdf"),
          mimetype: "application/pdf",
          caption: `Ficha técnica - ${modelLabel}`,
        });
        return true;
      }
    }
    return false;
  };

  const requestedIdx = args.extractBundleOptionIndexes(args.text).slice(0, 3);
  const optionPool =
    (Array.isArray(args.previousMemory?.quote_bundle_options_current) ? args.previousMemory.quote_bundle_options_current : [])
      .concat(Array.isArray(args.previousMemory?.pending_product_options) ? args.previousMemory.pending_product_options : [])
      .concat(Array.isArray(args.previousMemory?.last_recommended_options) ? args.previousMemory.last_recommended_options : [])
      .filter((o: any, idx: number, arr: any[]) => {
        const key = String(o?.id || o?.product_id || o?.raw_name || o?.name || "").trim();
        if (!key) return false;
        return arr.findIndex((x: any) => String(x?.id || x?.product_id || x?.raw_name || x?.name || "").trim() === key) === idx;
      });

  if (requestedIdx.length >= 2 && optionPool.length >= Math.max(...requestedIdx)) {
    const ownerRowsList = Array.isArray(args.ownerRows) ? args.ownerRows : [];
    const selectedRows = requestedIdx
      .map((n) => optionPool[n - 1])
      .filter(Boolean)
      .map((opt: any) => {
        const byId = String(opt?.id || opt?.product_id || "").trim();
        if (byId) {
          const rowById = ownerRowsList.find((r: any) => String(r?.id || "").trim() === byId);
          if (rowById) return rowById;
        }
        const byName = String(opt?.raw_name || opt?.name || "").trim();
        return byName ? args.findCatalogProductByName(ownerRowsList, byName) : null;
      })
      .filter(Boolean)
      .filter((row: any, idx: number, arr: any[]) => {
        const id = String(row?.id || "").trim();
        return id ? arr.findIndex((x: any) => String(x?.id || "").trim() === id) === idx : false;
      });

    let attachedCount = 0;
    const attachedNames: string[] = [];
    for (const row of selectedRows) {
      const label = String((row as any)?.name || "modelo").trim();
      const ok = await appendSheetFromRow(row, label);
      if (ok) {
        attachedCount += 1;
        attachedNames.push(label);
      }
    }

    strictReply = attachedCount >= 1
      ? (attachedCount === 1
          ? `Perfecto. Te envío por este WhatsApp la ficha técnica en PDF de ${attachedNames[0]}.`
          : `Perfecto. Te envío por este WhatsApp las fichas técnicas en PDF de: ${attachedNames.join(", ")}.`)
      : "No encontré fichas PDF válidas para esas referencias en este momento. Si quieres, te comparto especificaciones o cotización de inmediato.";
    return { handled: true, strictReply };
  }

  const datasheetUrl = args.pickBestProductPdfUrl(args.selectedProduct, args.text) || "";
  const localPdfPath = args.pickBestLocalPdfPath(args.selectedProduct, args.text);
  let attached = false;
  if (datasheetUrl) {
    const remote = await args.fetchRemoteFileAsBase64(datasheetUrl);
    const remoteLooksPdf = Boolean(remote) && (/application\/pdf/i.test(String(remote?.mimetype || "")) || /\.pdf(\?|$)/i.test(datasheetUrl));
    if (remote && remoteLooksPdf && Number(remote.byteSize || 0) <= args.maxWhatsappDocBytes) {
      args.strictDocs.push({
        base64: remote.base64,
        fileName: args.safeFileName(remote.fileName, `ficha-${args.selectedName}`, "pdf"),
        mimetype: "application/pdf",
        caption: `Ficha técnica - ${args.selectedName}`,
      });
      attached = true;
    }
  }
  if (!attached && localPdfPath) {
    const local = args.fetchLocalFileAsBase64(localPdfPath);
    if (local && Number(local.byteSize || 0) <= args.maxWhatsappDocBytes) {
      args.strictDocs.push({
        base64: local.base64,
        fileName: args.safeFileName(local.fileName, `ficha-${args.selectedName}`, "pdf"),
        mimetype: "application/pdf",
        caption: `Ficha técnica - ${args.selectedName}`,
      });
      attached = true;
    }
  }
  if (attached) {
    strictReply = `Perfecto. Te envío por este WhatsApp la ficha técnica en PDF de ${args.selectedName}.`;
    return { handled: true, strictReply };
  }

  const technicalSummary = args.buildTechnicalSummary(args.selectedProduct, 6);
  strictReply = technicalSummary
    ? [
        `No tengo un PDF válido para ${args.selectedName} en este momento, pero sí te comparto las especificaciones disponibles en catálogo:`,
        technicalSummary,
        "",
        `${datasheetUrl ? `Enlace directo de ficha: ${datasheetUrl}` : ""}`,
        "Si quieres, te genero la cotización ahora.",
      ].join("\n")
    : `${
        `No tengo un PDF válido para ${args.selectedName} en este momento y tampoco tengo especificaciones completas cargadas para este modelo.`
      }${datasheetUrl ? `\nEnlace directo de ficha: ${datasheetUrl}` : ""}\nSi quieres, te genero la cotización ahora.`;
  args.strictMemory.awaiting_action = "strict_confirm_quote_after_missing_sheet";
  return { handled: true, strictReply };
}
