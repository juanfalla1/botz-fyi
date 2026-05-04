import { jsPDF } from "jspdf";

export type QuotePdfLineItem = {
  productName: string;
  quantity: number;
  basePriceUsd: number;
  trmRate: number;
  totalCop: number;
  description?: string;
  warranty?: string;
  imageDataUrl?: string;
};

export function quoteIvaRate(): number {
  const raw = Number(process.env.WHATSAPP_QUOTE_IVA_RATE || 0.19);
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return 0.19;
  return raw;
}

export async function buildStandardQuotePdf(args: {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  city?: string;
  nit?: string;
  createdAt?: string;
  updatedAt?: string;
  items: QuotePdfLineItem[];
  enableProductImage: boolean;
  normalizePhone: (phone: string) => string;
  formatMoney: (n: number) => string;
  asDateYmd: (input: Date | string) => string;
  resolveQuoteBannerImageDataUrl: () => Promise<string>;
  resolveQuotePerksImageDataUrl: () => Promise<string>;
  resolveQuoteSocialImageDataUrl: () => Promise<string>;
  absoluteImageFileToDataUrl: (absolutePath: string) => string;
  localQuoteSocialFbPath: string;
  localQuoteSocialIgPath: string;
  localQuoteSocialInPath: string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const ptToMm = (v: number) => (v * 25.4) / 72;
  const marginLeft = ptToMm(33.12);
  const marginTop = ptToMm(54.0);
  const contentW = ptToMm(533.64);
  const CONTACT_H = ptToMm(55.23);
  const OBS_H = ptToMm(55.2);
  const FOOTER_H = ptToMm(109.46);
  const blue = [9, 137, 189] as const;
  const dark = [20, 20, 20] as const;
  const phoneSafe = args.normalizePhone(args.customerPhone || "");
  const ivaRate = quoteIvaRate();

  const bannerDataUrl = await args.resolveQuoteBannerImageDataUrl();
  const perksDataUrl = await args.resolveQuotePerksImageDataUrl();
  const socialDataUrl = await args.resolveQuoteSocialImageDataUrl();
  const x = marginLeft;
  const y = marginTop;

  const hasEmbeddedHeader = Boolean(String(bannerDataUrl || "").trim());
  const bannerBoxH = hasEmbeddedHeader ? ptToMm(192.39) : 27.8;
  const inviteStripH = hasEmbeddedHeader ? 0 : 10.2;
  const titleStripH = hasEmbeddedHeader ? 0 : 4.8;
  const bannerW = contentW;
  const bannerH = ptToMm(192.39);

  doc.setDrawColor(35, 35, 35);
  doc.setLineWidth(ptToMm(0.14));
  doc.rect(x, y, contentW, bannerBoxH + inviteStripH + titleStripH, "S");
  if (bannerDataUrl) {
    try {
      const fmt = /^data:image\/png/i.test(bannerDataUrl) ? "PNG" : /^data:image\/webp/i.test(bannerDataUrl) ? "WEBP" : "JPEG";
      doc.addImage(bannerDataUrl, fmt as any, x, y, bannerW, bannerH, undefined, "SLOW");
    } catch {}
  }

  const infoTop = y + bannerBoxH;
  const infoH = ptToMm(82.35);
  doc.setLineWidth(ptToMm(0.14));
  doc.rect(x, infoTop, contentW, infoH, "S");
  const halfX = ptToMm(305.81);
  doc.line(halfX, infoTop, halfX, infoTop + infoH);
  for (let i = 1; i <= 6; i += 1) doc.line(x, infoTop + ptToMm(13.56) * i, x + contentW, infoTop + ptToMm(13.56) * i);

  const leftRows: Array<[string, string]> = [["Cliente", args.companyName || args.customerName || "-"], ["Contacto", args.customerName || "-"], ["Dirección", String(args.city || "Bogota D.C")], ["Numero de Cotizacion", args.quoteNumber], ["Forma de Pago", "Contado"]];
  const rightRows: Array<[string, string]> = [["NIT", String(args.nit || "-")], ["Celular", phoneSafe.length >= 10 && phoneSafe.length <= 15 ? phoneSafe : "-"], ["Correo", args.customerEmail || "-"], ["Fecha de Validez", args.validUntil], ["Fecha de Entrega", "45 días hábiles"]];
  let rowY = infoTop + ptToMm(10.8);
  for (let i = 0; i < 5; i += 1) {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8.04);
    const l = `${leftRows[i][0]}:`; doc.text(l, x + 2, rowY); doc.setFont("helvetica", "normal"); doc.text(String(leftRows[i][1] || "-").slice(0, 35), x + 2 + doc.getTextWidth(l) + 2, rowY);
    doc.setFont("helvetica", "bold"); const r = `${rightRows[i][0]}:`; doc.text(r, halfX + 2, rowY); doc.setFont("helvetica", "normal"); doc.text(String(rightRows[i][1] || "-").slice(0, 33), halfX + 2 + doc.getTextWidth(r) + 2, rowY);
    rowY += ptToMm(13.56);
  }

  const tableHeadY = infoTop + infoH;
  const headH = ptToMm(13.68);
  const c0 = ptToMm(33.12), c1 = ptToMm(59.52), c2 = ptToMm(141.62), c3 = ptToMm(305.81), c4 = ptToMm(374.23), c5 = ptToMm(415.27), c6 = ptToMm(483.70), c7 = ptToMm(566.76);
  const descW = c3 - c2, warrantyW = c4 - c3;
  doc.setFillColor(blue[0], blue[1], blue[2]); doc.rect(ptToMm(32.64), tableHeadY, ptToMm(533.76), headH, "F");
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.96); doc.setTextColor(255, 255, 255);
  doc.text("Item", c0 + ptToMm(1.8), tableHeadY + ptToMm(9.4)); doc.text("Producto", c1 + ptToMm(1.5), tableHeadY + ptToMm(9.4)); doc.text("Descripcion", c2 + ptToMm(1.5), tableHeadY + ptToMm(9.4)); doc.text("Garantía", c3 + ptToMm(1.5), tableHeadY + ptToMm(9.4)); doc.text("Cant.", c5 - ptToMm(1.2), tableHeadY + ptToMm(9.4), { align: "right" }); doc.text("Valor unit.", c6 - ptToMm(1.2), tableHeadY + ptToMm(9.4), { align: "right" }); doc.text("Valor total", c7 - ptToMm(1.2), tableHeadY + ptToMm(9.4), { align: "right" });
  doc.setTextColor(dark[0], dark[1], dark[2]);

  const normalizedLineItems = (Array.isArray(args.items) && args.items.length ? args.items : [{ productName: "-", quantity: 1, basePriceUsd: 0, trmRate: 0, totalCop: 0, description: "Producto sin detalle", warranty: "1 AÑO POR DEFECTO DE FABRICA", imageDataUrl: "" }]).map((row) => {
    const qty = Math.max(1, Number(row.quantity || 1));
    const lineTotal = Number(row.totalCop || 0) > 0 ? Number(row.totalCop || 0) : Number(row.basePriceUsd || 0) * Number(row.trmRate || 0) * qty;
    return { ...row, quantity: qty, lineTotal };
  });

  let subtotal = 0;
  const itemRowY = tableHeadY + headH;
  const itemRowH = ptToMm(258.62);
  doc.setLineWidth(ptToMm(0.14)); doc.rect(x, itemRowY, contentW, itemRowH, "S"); [c1, c2, c3, c4, c5, c6].forEach((cx) => doc.line(cx, itemRowY, cx, itemRowY + itemRowH));
  const maxRows = Math.min(normalizedLineItems.length, normalizedLineItems.length <= 1 ? 1 : 6);
  const rowH = normalizedLineItems.length <= 1 ? itemRowH : itemRowH / maxRows;
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.6);
  for (let i = 0; i < maxRows; i += 1) {
    if (i > 0) doc.line(x, itemRowY + rowH * i, x + contentW, itemRowY + rowH * i);
    const row = normalizedLineItems[i];
    const top = itemRowY + rowH * i;
    const textY = top + (normalizedLineItems.length <= 1 ? 5 : 4.4);
    const qty = Math.max(1, Number((row as any).quantity || 1));
    const lineTotal = Number((row as any).lineTotal || 0);
    subtotal += lineTotal;
    doc.text(String(i + 1), c0 + 3, textY); doc.setFont("helvetica", "bold"); doc.text(String(row.productName || "-").slice(0, normalizedLineItems.length <= 1 ? 20 : 24), c1 + 1.2, textY); doc.setFont("helvetica", "normal");
    const descText = String(row.description || `Producto: ${String(row.productName || "-")}`).replace(/[^\x20-\x7EÁÉÍÓÚáéíóúÑñÜü°µ±×.,:;()\/-]/g, " ").replace(/\s+/g, " ").trim();
    const descMax = normalizedLineItems.length <= 1 ? 28 : Math.max(2, Math.min(7, Math.floor((rowH - 3) / 2.8)));
    const descLines = doc.splitTextToSize(descText, descW - 2).slice(0, descMax);
    if (doc.splitTextToSize(descText, descW - 2).length > descMax && descLines.length) descLines[descLines.length - 1] = `${String(descLines[descLines.length - 1] || "").trimEnd()}...`;
    doc.text(descLines, c2 + 1.2, textY);
    const wMax = normalizedLineItems.length <= 1 ? 8 : Math.max(1, Math.min(4, Math.floor((rowH - 3) / 3.2)));
    doc.text(doc.splitTextToSize(String(row.warranty || "1 AÑO POR DEFECTO DE FABRICA"), warrantyW - 2).slice(0, wMax), c3 + 1.2, textY);
    doc.text(String(qty), c5 - 1.2, textY, { align: "right" });
    doc.text(`$ ${args.formatMoney(lineTotal / qty)}`, c6 - 1.2, textY, { align: "right" });
    doc.text(`$ ${args.formatMoney(lineTotal)}`, c7 - 1.2, textY, { align: "right" });
  }
  if (normalizedLineItems.length > maxRows) { doc.setFontSize(6.2); doc.text(`+${normalizedLineItems.length - maxRows} referencia(s) adicional(es) en la cotizacion consolidada`, c2 + 1.2, itemRowY + itemRowH - 2.6); }

  const contactTop = itemRowY + itemRowH;
  const totalsX = ptToMm(415.27);
  const contactLeftW = ptToMm(415.27 - 33.12);
  doc.rect(x, contactTop, contactLeftW, CONTACT_H, "S"); doc.setFont("helvetica", "normal"); doc.setFontSize(8.04); doc.text("Contacto Comercial", x + 1.5, contactTop + 3.8); doc.text("Milena", x + 1.5, contactTop + 7.8); doc.text("CEL 3008265047", x + 1.5, contactTop + 11.8); doc.text("cotizaciones@avanzagroup.com.co", x + 1.5, contactTop + 15.8);
  const iva = subtotal * ivaRate; const total = subtotal + iva;
  doc.setFillColor(blue[0], blue[1], blue[2]); const totalsLabelW = ptToMm(68.43); const totalsValueW = ptToMm(83.06);
  doc.rect(totalsX, contactTop, totalsLabelW, CONTACT_H, "F"); doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(8.04);
  doc.text("Subtotal:", totalsX + 1.6, contactTop + 4.2); doc.text("Descuento:", totalsX + 1.6, contactTop + 8.4); doc.text(`IVA (${Math.round(ivaRate * 100)}%):`, totalsX + 1.6, contactTop + 12.6); doc.text("Valor total:", totalsX + 1.6, contactTop + 16.8);
  doc.setTextColor(dark[0], dark[1], dark[2]); doc.rect(totalsX + totalsLabelW, contactTop, totalsValueW, CONTACT_H, "S"); const valRight = ptToMm(566.76) - ptToMm(3.2);
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.1); doc.text(`$${args.formatMoney(subtotal)}`, valRight, contactTop + 4.2, { align: "right" }); doc.text(`$${args.formatMoney(0)}`, valRight, contactTop + 8.4, { align: "right" }); doc.text(`$${args.formatMoney(iva)}`, valRight, contactTop + 12.6, { align: "right" }); doc.setFont("helvetica", "bold"); doc.text(`$${args.formatMoney(total)}`, valRight, contactTop + 16.8, { align: "right" });

  const obsTop = contactTop + CONTACT_H;
  doc.rect(x, obsTop, contentW, OBS_H, "S");
  const legal = ["Observaciones generales de la cotización", "- Todos los distribuidores asumen el valor del flete. En el caso de clientes, el flete sera asumido unicamente si el envio es fuera de Bogota.", "- No realizamos devoluciones de dinero, excepto cuando se confirme un error de asesoramiento por parte de nuestro equipo.", "No dude en contactarnos para cualquier duda o solicitud adicional. Gracias por confiar en nosotros.", `${String(args.city || "Bogota D.C")}, ${args.issueDate}`].join("\n");
  doc.setFont("helvetica", "normal"); doc.setFontSize(6.96); doc.text(doc.splitTextToSize(legal, contentW - 3).slice(0, 16), x + 1.5, obsTop + 4.5);

  const footerTop = obsTop + OBS_H;
  doc.rect(x, footerTop, contentW, FOOTER_H, "S");
  const companyFooter = ["AVANZA INTERNACIONAL GROUP S.A.S", "Autopista Medellín k 2.5 entrada parcelas 900 metros - Ciem oikos occidente bodega 7a. NIT 900505419", "CELULAR 321 2165 771", "www.balanzasybasculas.com.co - www.avanzagroup.com.co"].join("\n");
  doc.setFontSize(8.04); doc.text(doc.splitTextToSize(companyFooter, contentW - 44).slice(0, 7), x + 1.5, footerTop + 6);
  if (perksDataUrl) { try { const perksFmt = /^data:image\/png/i.test(perksDataUrl) ? "PNG" : /^data:image\/webp/i.test(perksDataUrl) ? "WEBP" : "JPEG"; doc.addImage(perksDataUrl, perksFmt as any, ptToMm(422.17), ptToMm(713.77), ptToMm(124.57), ptToMm(52.2)); } catch {} }
  const fbDataUrl = args.absoluteImageFileToDataUrl(args.localQuoteSocialFbPath);
  const igDataUrl = args.absoluteImageFileToDataUrl(args.localQuoteSocialIgPath);
  const inDataUrl = args.absoluteImageFileToDataUrl(args.localQuoteSocialInPath);
  if (fbDataUrl || igDataUrl || inDataUrl) {
    const drawIcon = (dataUrl: string, iconX: number) => { if (!dataUrl) return; try { const iconFmt = /^data:image\/png/i.test(dataUrl) ? "PNG" : /^data:image\/webp/i.test(dataUrl) ? "WEBP" : "JPEG"; doc.addImage(dataUrl, iconFmt as any, iconX, ptToMm(781.12), ptToMm(22.5), ptToMm(22.5)); } catch {} };
    drawIcon(fbDataUrl, ptToMm(444.38)); drawIcon(igDataUrl, ptToMm(474.37)); drawIcon(inDataUrl, ptToMm(503.46));
  } else if (socialDataUrl) {
    try { const socialFmt = /^data:image\/png/i.test(socialDataUrl) ? "PNG" : /^data:image\/webp/i.test(socialDataUrl) ? "WEBP" : "JPEG"; doc.addImage(socialDataUrl, socialFmt as any, ptToMm(444.38), ptToMm(781.12), ptToMm(81.58), ptToMm(22.5)); } catch {}
  }

  const nowStamp = new Date();
  const createdDate = String(args.createdAt || "").trim() ? new Date(String(args.createdAt || "")) : nowStamp;
  const updatedDate = String(args.updatedAt || "").trim() ? new Date(String(args.updatedAt || "")) : nowStamp;
  doc.setFontSize(6.96);
  doc.text(`Fecha de creación ${args.asDateYmd(createdDate)}`, x + 1.5, footerTop + FOOTER_H - 8);
  doc.text(`Fecha de modificación ${args.asDateYmd(updatedDate)} ${String(updatedDate.toTimeString() || "").slice(0, 8)}`, x + 1.5, footerTop + FOOTER_H - 3);
  return Buffer.from(doc.output("arraybuffer")).toString("base64");
}

export async function buildQuotePdf(args: {
  draftId: string; companyName: string; customerName: string; customerEmail: string; customerPhone: string; productName: string; quantity: number; basePriceUsd: number; trmRate: number; totalCop: number; city?: string; nit?: string; createdAt?: string; updatedAt?: string; itemDescription?: string; imageDataUrl?: string;
} & Pick<Parameters<typeof buildStandardQuotePdf>[0], "formatMoney" | "asDateYmd" | "normalizePhone" | "resolveQuoteBannerImageDataUrl" | "resolveQuotePerksImageDataUrl" | "resolveQuoteSocialImageDataUrl" | "absoluteImageFileToDataUrl" | "localQuoteSocialFbPath" | "localQuoteSocialIgPath" | "localQuoteSocialInPath" | "enableProductImage">) {
  const now = new Date();
  const issueDate = args.asDateYmd(now);
  const validUntil = args.asDateYmd(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
  const quantity = Math.max(1, Number(args.quantity || 1));
  const totalCop = Number(args.totalCop || 0) > 0 ? Number(args.totalCop || 0) : Number(args.basePriceUsd || 0) * Number(args.trmRate || 0) * quantity;
  return buildStandardQuotePdf({
    ...args,
    quoteNumber: `CO${String(Math.abs(String(args.draftId || "").split("").reduce((h, c) => ((h * 31 + c.charCodeAt(0)) | 0), 0) % 100000)).padStart(5, "0")}`,
    issueDate,
    validUntil,
    city: String(args.city || "").trim() || "Bogota D.C",
    nit: String(args.nit || "").trim() || "-",
    items: [{ productName: args.productName, quantity, basePriceUsd: Number(args.basePriceUsd || 0), trmRate: Number(args.trmRate || 0), totalCop, description: String(args.itemDescription || "").trim() || `Producto: ${String(args.productName || "-")}`, imageDataUrl: String(args.imageDataUrl || "").trim() }],
  });
}

export async function buildSimpleQuotePdf(args: {
  draftId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  companyName: string;
  productName: string;
  quantity: number;
  trmRate: number;
  totalCop: number;
  city: string;
  nit: string;
  asDateYmd: (input: Date | string) => string;
  formatMoney: (n: number) => string;
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const today = args.asDateYmd(new Date());
  let y = 16;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(14);
  doc.text("Avanza Internacional Group S.A.S.", 12, y);
  y += 8;
  doc.setFontSize(12);
  doc.text("Cotizacion Comercial", 12, y);
  y += 8;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  const rows: string[] = [
    `Numero: CO${String(Math.abs(String(args.draftId || "").split("").reduce((h, c) => ((h * 31 + c.charCodeAt(0)) | 0), 0) % 100000)).padStart(5, "0")}`,
    `Fecha: ${today}`,
    `Cliente: ${String(args.companyName || args.customerName || "-")}`,
    `Contacto: ${String(args.customerName || "-")}`,
    `NIT: ${String(args.nit || "-")}`,
    `Ciudad: ${String(args.city || "Bogota")}`,
    `Correo: ${String(args.customerEmail || "-")}`,
    `Celular: ${String(args.customerPhone || "-")}`,
    "",
    `Producto: ${String(args.productName || "-")}`,
    `Cantidad: ${Math.max(1, Number(args.quantity || 1))}`,
    `TRM: ${args.formatMoney(Number(args.trmRate || 0))}`,
    `Total COP: ${args.formatMoney(Number(args.totalCop || 0))}`,
  ];
  for (const line of rows) {
    doc.text(line, 12, y);
    y += 5.5;
  }
  const dataUri = doc.output("datauristring");
  return String(dataUri || "").split(",")[1] || "";
}

export async function buildBundleQuotePdf(args: {
  bundleId: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  items: Array<{ productName: string; quantity: number; basePriceUsd: number; trmRate: number; totalCop: number; description?: string; imageDataUrl?: string }>;
} & Pick<Parameters<typeof buildStandardQuotePdf>[0], "formatMoney" | "asDateYmd" | "normalizePhone" | "resolveQuoteBannerImageDataUrl" | "resolveQuotePerksImageDataUrl" | "resolveQuoteSocialImageDataUrl" | "absoluteImageFileToDataUrl" | "localQuoteSocialFbPath" | "localQuoteSocialIgPath" | "localQuoteSocialInPath" | "enableProductImage">) {
  const now = new Date();
  const quoteNumber = `CO-B-${String(args.bundleId || "").replace(/[^a-z0-9]/gi, "").slice(-8).toUpperCase()}`;
  const issueDate = args.asDateYmd(now);
  const validUntil = args.asDateYmd(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));
  return buildStandardQuotePdf({
    ...args,
    quoteNumber,
    issueDate,
    validUntil,
    items: (args.items || []).map((item: any) => {
      const qty = Math.max(1, Number(item.quantity || 1));
      const totalCop = Number(item.totalCop || 0) > 0 ? Number(item.totalCop || 0) : Number(item.basePriceUsd || 0) * Number(item.trmRate || 0) * qty;
      return { productName: String(item.productName || "-"), quantity: qty, basePriceUsd: Number(item.basePriceUsd || 0), trmRate: Number(item.trmRate || 0), totalCop, description: String(item.description || "").trim() || `Producto: ${String(item.productName || "-")}`, imageDataUrl: String(item.imageDataUrl || "").trim() };
    }),
  });
}
