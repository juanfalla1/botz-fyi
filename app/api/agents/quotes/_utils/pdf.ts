import fs from "fs";
import path from "path";
import { jsPDF } from "jspdf/dist/jspdf.es.min.js";

function normalizePhone(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(n || 0));
}

function quoteCodeFromDraftId(draftId: string) {
  const raw = String(draftId || "");
  let h = 0;
  for (let i = 0; i < raw.length; i += 1) h = (h * 31 + raw.charCodeAt(i)) | 0;
  const n = Math.abs(h % 100000);
  return `CO${String(n).padStart(5, "0")}`;
}

function asDateYmd(input: Date | string) {
  const d = input instanceof Date ? input : new Date(input);
  const ts = Number.isFinite(d.getTime()) ? d.getTime() : Date.now();
  return new Date(ts).toISOString().slice(0, 10);
}

const LOCAL_QUOTE_BANNER_PATH = path.join(
  process.cwd(),
  "app",
  "api",
  "agents",
  "channels",
  "evolution",
  "webhook-v2",
  "banner_cotizacion_avanza_ohaus.png"
);

const LOCAL_QUOTE_PERKS_PATH = path.join(
  process.cwd(),
  "app",
  "api",
  "agents",
  "channels",
  "evolution",
  "webhook-v2",
  "ee3062f7-f286-4d62-b63b-29c796a8799f.png"
);

function localImageToDataUrl(filePath: string): string {
  try {
    if (!filePath || !fs.existsSync(filePath)) return "";
    const ext = String(path.extname(filePath || "")).toLowerCase();
    const mime = ext === ".png"
      ? "image/png"
      : (ext === ".jpg" || ext === ".jpeg")
        ? "image/jpeg"
        : ext === ".webp"
          ? "image/webp"
          : "";
    if (!mime) return "";
    const base64 = fs.readFileSync(filePath).toString("base64");
    if (!base64) return "";
    return `data:${mime};base64,${base64}`;
  } catch {
    return "";
  }
}

type QuotePdfLineItem = {
  productName: string;
  quantity: number;
  basePriceUsd: number;
  trmRate: number;
  totalCop: number;
  description?: string;
  warranty?: string;
  imageDataUrl?: string;
};

function quoteIvaRate(): number {
  const raw = Number(process.env.WHATSAPP_QUOTE_IVA_RATE || 0.19);
  if (!Number.isFinite(raw) || raw < 0 || raw > 1) return 0.19;
  return raw;
}

async function buildStandardQuotePdf(args: {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  city?: string;
  nit?: string;
  items: QuotePdfLineItem[];
}) {
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const blue = [9, 137, 189] as const;
  const dark = [20, 20, 20] as const;
  const phoneSafe = normalizePhone(args.customerPhone || "");
  const ivaRate = quoteIvaRate();
  const col = [10, 20, 50, 127, 145, 157, 178, 200];
  const footerPageTop = 284;

  const bannerDataUrl = localImageToDataUrl(LOCAL_QUOTE_BANNER_PATH);
  const hasBanner = Boolean(String(bannerDataUrl || "").trim());
  const perksDataUrl = localImageToDataUrl(LOCAL_QUOTE_PERKS_PATH);
  const hasPerksStrip = Boolean(String(perksDataUrl || "").trim());

  const drawHeader = (compact = false) => {
    doc.setFillColor(245, 248, 251);
    doc.rect(0, 0, 210, 297, "F");
    const boxHeight = compact ? 20 : (hasBanner ? 62 : 28);
    const titleBarY = compact ? 20 : (hasBanner ? 66 : 28);
    doc.setFillColor(255, 255, 255);
    doc.rect(8, 8, 194, boxHeight, "F");
    doc.setDrawColor(210, 220, 228);
    doc.rect(8, 8, 194, boxHeight, "S");

    if (hasBanner && !compact) {
      try {
        doc.addImage(bannerDataUrl, "PNG", 8.5, 8.5, 193, 55);
      } catch {
        // ignore
      }
    }

    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(8, titleBarY, 194, 8, "F");

    doc.setFont("helvetica", "bold");
    doc.setTextColor(237, 106, 47);
    doc.setFontSize(compact ? 22 : 28);
    if (!hasBanner || compact) doc.text("Avanza", 12, compact ? 19 : 20);
    doc.setTextColor(220, 23, 55);
    doc.setFontSize(compact ? 16 : 20);
    if (!hasBanner || compact) doc.text("OHAUS", compact ? 50 : 60, compact ? 19 : 20);
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(10);
    doc.text("AVANZA INTERNACIONAL GROUP S.A.S. - Cotizacion Comercial", 12, titleBarY + 5.2);
    doc.setTextColor(dark[0], dark[1], dark[2]);
  };

  drawHeader(false);

  const infoTitleY = hasBanner ? 82 : 44;
  const infoTopY = hasBanner ? 85 : 47;
  const tableHeaderY = hasBanner ? 117 : 79;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Informacion general", 12, infoTitleY);
  doc.setDrawColor(180, 196, 210);
  doc.rect(10, infoTopY, 190, 28, "S");
  doc.line(105, infoTopY, 105, infoTopY + 28);

  const leftRows: Array<[string, string]> = [
    ["Cliente", args.companyName || args.customerName || "-"],
    ["Contacto", args.customerName || "-"],
    ["Direccion", String(args.city || "Bogota D.C")],
    ["Numero de Cotizacion", args.quoteNumber],
    ["Forma de Pago", "Contado"],
  ];
  const rightRows: Array<[string, string]> = [
    ["NIT", String(args.nit || "-")],
    ["Celular", phoneSafe.length >= 10 && phoneSafe.length <= 15 ? phoneSafe : "-"],
    ["Correo", args.customerEmail || "-"],
    ["Fecha de Validez", args.validUntil],
    ["Fecha de Entrega", "45 dias habiles"],
  ];

  let yRow = infoTopY + 5;
  for (let i = 0; i < leftRows.length; i += 1) {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.3);
    const leftLabel = `${leftRows[i][0]}:`;
    doc.text(leftLabel, 12, yRow);
    doc.setFont("helvetica", "normal");
    doc.text(String(leftRows[i][1] || "-").slice(0, 32), 12 + doc.getTextWidth(leftLabel) + 3, yRow);
    doc.setFont("helvetica", "bold");
    const rightLabel = `${rightRows[i][0]}:`;
    doc.text(rightLabel, 108, yRow);
    doc.setFont("helvetica", "normal");
    doc.text(String(rightRows[i][1] || "-").slice(0, 30), 108 + doc.getTextWidth(rightLabel) + 3, yRow);
    yRow += 5;
  }

  const drawTableHeader = (yTop: number) => {
    doc.setFillColor(blue[0], blue[1], blue[2]);
    doc.rect(10, yTop, 190, 7, "F");
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8.2);
    doc.text("Item", 12, yTop + 5.2);
    doc.text("Producto", 24, yTop + 5.2);
    doc.text("Descripcion", 52, yTop + 5.2);
    doc.text("Garantia", 129.5, yTop + 5.2);
    doc.text("Cant.", 155, yTop + 5.2, { align: "right" });
    doc.text("Valor unit.", 176.5, yTop + 5.2, { align: "right" });
    doc.text("Valor total", 196.8, yTop + 5.2, { align: "right" });
    doc.setTextColor(dark[0], dark[1], dark[2]);
  };

  let currentTableHeaderY = tableHeaderY;
  let tableHeaderDrawn = false;
  let y = currentTableHeaderY + 11;
  let index = 1;
  let subtotal = 0;
  const lineHeight = 3.5;
  const rowPadding = 3;

  for (const item of args.items || []) {
    const qty = Math.max(1, Number(item.quantity || 1));
    const lineTotal = Number(item.totalCop || 0) > 0
      ? Number(item.totalCop || 0)
      : Number(item.basePriceUsd || 0) * Number(item.trmRate || 0) * qty;
    subtotal += lineTotal;

    const baseDesc = String(item.description || "").trim() || `Producto: ${String(item.productName || "-")}`;
    const productLines = doc.splitTextToSize(String(item.productName || "-").slice(0, 40), 28).slice(0, 2);
    const descLinesAll = doc.splitTextToSize(baseDesc, 74);

    const rowHeightFor = (descCount: number) => {
      const lineCount = Math.max(productLines.length, Math.max(descCount, 1), 1);
      return Math.max(12, lineCount * lineHeight + rowPadding);
    };
    const minRowH = rowHeightFor(Math.max(1, descLinesAll.length));

    if (!tableHeaderDrawn) {
      if (y + minRowH > 235) {
        drawHeader(true);
        currentTableHeaderY = 33;
        y = 42;
      }
      drawTableHeader(currentTableHeaderY);
      tableHeaderDrawn = true;
    }

    if (y + minRowH > 235) {
      doc.addPage();
      drawHeader(true);
      currentTableHeaderY = 33;
      drawTableHeader(currentTableHeaderY);
      y = 42;
    }

    const rowH = rowHeightFor(Math.max(1, descLinesAll.length));

    doc.setDrawColor(180, 196, 210);
    doc.rect(10, y - 4, 190, rowH, "S");
    for (let i = 1; i < col.length - 1; i += 1) {
      doc.line(col[i], y - 4, col[i], y - 4 + rowH);
    }

    const bodyY = y + 1.8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.2);
    doc.text(String(index), 12, bodyY);
    doc.setFont("helvetica", "bold");
    doc.text(productLines, 22, bodyY);
    doc.setFont("helvetica", "normal");
    doc.text(descLinesAll, 52, bodyY);
    doc.text(String(item.warranty || "1 AÑO POR\nDEFECTO DE\nFABRICA"), 128.8, bodyY);
    doc.text(String(qty), 155, bodyY, { align: "right" });
    doc.setFontSize(7.8);
    doc.text(`$ ${formatMoney(lineTotal / qty)}`, 176.5, bodyY, { align: "right" });
    doc.text(`$ ${formatMoney(lineTotal)}`, 196.8, bodyY, { align: "right" });
    doc.setFontSize(8.2);

    y += rowH + 0.9;
    index += 1;
  }

  const iva = subtotal * ivaRate;
  const total = subtotal + iva;

  if (y > 240) {
    doc.addPage();
    drawHeader(true);
    y = 40;
  }

  const totalsLabelX = 128;
  const totalsLabelW = 42;
  const totalsValueX = totalsLabelX + totalsLabelW;
  const totalsValueW = 30;
  const totalsValueRight = totalsValueX + totalsValueW - 1;

  doc.setFillColor(blue[0], blue[1], blue[2]);
  doc.rect(totalsLabelX, y, totalsLabelW, 24, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.text("Subtotal:", totalsLabelX + 2, y + 6);
  doc.text("Descuento:", totalsLabelX + 2, y + 12.2);
  doc.text(`IVA (${Math.round(ivaRate * 100)}%):`, totalsLabelX + 2, y + 18.4);
  doc.text("Valor total:", totalsLabelX + 2, y + 22.8);

  doc.setTextColor(dark[0], dark[1], dark[2]);
  doc.rect(totalsValueX, y, totalsValueW, 24, "S");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.4);
  doc.text(`$ ${formatMoney(subtotal)}`, totalsValueRight, y + 6, { align: "right" });
  doc.text(`$ ${formatMoney(0)}`, totalsValueRight, y + 12.2, { align: "right" });
  doc.text(`$ ${formatMoney(iva)}`, totalsValueRight, y + 18.4, { align: "right" });
  doc.setFont("helvetica", "bold");
  doc.text(`$ ${formatMoney(total)}`, totalsValueRight, y + 22.8, { align: "right" });

  let yFooter = y + 8;
  const legal = [
    "Observaciones generales de la cotización",
    "- Todos los distribuidores asumen el valor del flete. En el caso de clientes, el flete sera asumido unicamente si el envio es fuera de Bogota.",
    "- No realizamos devoluciones de dinero, excepto cuando se confirme un error de asesoramiento por parte de nuestro equipo.",
    "No dude en contactarnos para cualquier duda o solicitud adicional. Gracias por confiar en nosotros.",
    `${String(args.city || "Bogota D.C")}, ${args.issueDate}`,
  ].join("\n");
  const legalLines = doc.splitTextToSize(legal, 188);
  const companyFooter = [
    "AVANZA INTERNACIONAL GROUP S.A.S",
    "Autopista Medellin k 2.5 entrada parcelas 900 metros - Ciem oikos occidente bodega 7a.",
    "NIT 900505419",
    "CELULAR 321 2165 771",
    "www.balanzasybasculas.com.co - www.avanzagroup.com.co",
  ].join("\n");
  const companyFooterLines = doc.splitTextToSize(companyFooter, 188);
  const legalHeight = Math.max(10, legalLines.length * 3.3);
  const companyHeight = Math.max(10, companyFooterLines.length * 3.2);
  const closingEstimate = 18 + 24 + legalHeight + 16 + 10 + 12 + companyHeight + 14;
  if (yFooter + closingEstimate > 272) {
    doc.addPage();
    drawHeader(true);
    yFooter = 40;
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("Contacto Comercial", 10, yFooter);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.text("Mariana Rodriguez", 10, yFooter + 6);
  doc.text("CEL 3183731171", 10, yFooter + 11);
  doc.text("cotizaciones@avanzagroup.com.co", 10, yFooter + 16);

  doc.setFontSize(8.2);
  doc.text(legalLines, 10, yFooter + 24);

  const legalBottomY = yFooter + 24 + legalHeight;
  const perksY = legalBottomY + 10;
  if (hasPerksStrip) {
    try {
      const fmt = /^data:image\/png/i.test(perksDataUrl)
        ? "PNG"
        : /^data:image\/webp/i.test(perksDataUrl)
          ? "WEBP"
          : "JPEG";
      const props = (doc as any).getImageProperties?.(perksDataUrl) || null;
      let stripW = 172;
      let stripH = 24;
      if (props?.width && props?.height) {
        stripH = 20;
        stripW = (stripH * Number(props.width || 0)) / Math.max(1, Number(props.height || 1));
        if (stripW > 176) {
          const ratio = 176 / stripW;
          stripW *= ratio;
          stripH *= ratio;
        }
      }
      const stripX = (210 - stripW) / 2;
      const stripY = perksY - stripH / 2;
      doc.addImage(perksDataUrl, fmt as any, stripX, stripY, stripW, stripH);
    } catch {
      // ignore
    }
  }

  const footerBlockTop = perksY + 18;
  doc.setFontSize(7.2);
  doc.text(companyFooterLines, 10, footerBlockTop);

  const nowStamp = new Date();
  const createdAt = `${asDateYmd(nowStamp)}`;
  const modifiedAt = `${asDateYmd(nowStamp)} ${String(nowStamp.toTimeString() || "").slice(0, 8)}`;
  const footerMetaTop = footerBlockTop + companyHeight + 6;
  doc.setFontSize(7.8);
  doc.text(`Fecha de creación ${createdAt}`, 10, footerMetaTop);
  doc.text(`Fecha de modificación ${modifiedAt}`, 10, footerMetaTop + 5);

  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p += 1) {
    doc.setPage(p);
    doc.setFontSize(8.2);
    doc.setFont("helvetica", "bold");
    doc.text(`Pág ${p} de ${totalPages}`, 10, footerPageTop);
  }

  return Buffer.from(doc.output("arraybuffer")).toString("base64");
}

export async function buildQuotePdfFromDraft(draftId: string, draft: any): Promise<{ pdfBase64: string; fileName: string }> {
  const now = new Date();
  const payload = draft?.payload && typeof draft.payload === "object" ? draft.payload : {};
  const quantity = Math.max(1, Number(payload?.quantity || 1));
  const issueDate = asDateYmd(now);
  const validUntil = asDateYmd(new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000));

  const totalCop = Number(draft?.total_cop || 0) > 0
    ? Number(draft?.total_cop || 0)
    : Number(draft?.base_price_usd || 0) * Number(draft?.trm_rate || 0) * quantity;

  const pdfBase64 = await buildStandardQuotePdf({
    quoteNumber: quoteCodeFromDraftId(draftId),
    issueDate,
    validUntil,
    companyName: String(draft?.company_name || "").trim() || "-",
    customerName: String(draft?.customer_name || "").trim() || "-",
    customerEmail: String(draft?.customer_email || "").trim() || "-",
    customerPhone: String(draft?.customer_phone || "").trim() || "-",
    city: String(payload?.customer_city || draft?.location || "").trim() || "Bogota D.C",
    nit: String(payload?.customer_nit || "").trim() || "-",
    items: [
      {
        productName: String(draft?.product_name || "-").trim() || "-",
        quantity,
        basePriceUsd: Number(draft?.base_price_usd || 0),
        trmRate: Number(draft?.trm_rate || 0),
        totalCop,
        description: String(payload?.item_description || "").trim() || `Producto: ${String(draft?.product_name || "-")}`,
      },
    ],
  });

  const fileName = `cotizacion-${String(draftId || "").slice(0, 8)}.pdf`;
  return { pdfBase64, fileName };
}
