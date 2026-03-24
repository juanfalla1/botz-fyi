import { jsPDF } from "jspdf";

function normalizePhone(raw: string) {
  return String(raw || "").replace(/\D/g, "");
}

function printablePhone(raw: string) {
  const n = normalizePhone(raw || "");
  return n.length >= 10 && n.length <= 12 ? n : "-";
}

function formatMoney(n: number) {
  return new Intl.NumberFormat("es-CO", { maximumFractionDigits: 2 }).format(Number(n || 0));
}

export function buildQuotePdfFromDraft(draftId: string, draft: any): { pdfBase64: string; fileName: string } {
  const doc = new jsPDF();
  const now = new Date();
  const quoteNumber = `Q-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

  const payload = draft?.payload && typeof draft.payload === "object" ? draft.payload : {};
  const quantity = Math.max(1, Number(payload?.quantity || 1));
  const city = String(payload?.customer_city || draft?.location || "").trim() || "-";
  const nit = String(payload?.customer_nit || "").trim() || "-";
  const contactPerson = String(payload?.customer_contact || draft?.customer_name || "").trim() || "-";
  const itemDescription = String(payload?.item_description || "").trim();

  doc.setFillColor(10, 121, 167);
  doc.rect(0, 0, 210, 52, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(28);
  doc.text("Avanza", 14, 20);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("International group s.a.s", 70, 13);
  doc.text("EQUIPOS Y CONSUMIBLES PARA LABORATORIO", 14, 26);
  doc.setFontSize(10);
  doc.text("+57 300 8265047  |  +57 320 8336976", 14, 34);
  doc.text("Autopista Medellin K 2.5 entrada parcelas 900 m CIEM OIKOS OCCIDENTE", 14, 39);
  doc.text("Cra 81 # 32-332 Nueva Villa de Aburra - Local 332", 14, 44);
  doc.text("info@avanzagroup.com.co", 14, 49);

  doc.setTextColor(20, 20, 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.text("Cotizacion tecnica preliminar", 14, 64);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Numero: ${quoteNumber}`, 14, 71);
  doc.text(`Fecha: ${now.toLocaleString("es-CO")}`, 14, 76);

  let y = 86;
  const row = (k: string, v: string) => {
    doc.setFont("helvetica", "bold");
    doc.text(`${k}:`, 14, y);
    doc.setFont("helvetica", "normal");
    doc.text(v || "-", 56, y);
    y += 6;
  };

  row("Empresa", String(draft?.company_name || "Avanza Balanzas"));
  row("Cliente", String(draft?.customer_name || "-"));
  row("Contacto", contactPerson);
  row("Correo", String(draft?.customer_email || "-"));
  row("Telefono", printablePhone(String(draft?.customer_phone || "")));
  row("Ciudad", city);
  row("NIT", nit);
  row("Producto", String(draft?.product_name || "-"));
  row("Cantidad", String(quantity));
  row("Precio base USD", Number(draft?.base_price_usd || 0) > 0 ? formatMoney(Number(draft?.base_price_usd || 0)) : "-");
  row("TRM", Number(draft?.trm_rate || 0) > 0 ? formatMoney(Number(draft?.trm_rate || 0)) : "-");
  row("Total COP", Number(draft?.total_cop || 0) > 0 ? formatMoney(Number(draft?.total_cop || 0)) : "-");

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Descripcion:", 14, y);
  doc.setFont("helvetica", "normal");
  const description = itemDescription || `Producto: ${String(draft?.product_name || "-")}`;
  const descLines = doc.splitTextToSize(description, 180);
  doc.text(descLines, 14, y + 5);

  const notesY = y + 8 + descLines.length * 5;
  doc.setFont("helvetica", "bold");
  doc.text("Notas:", 14, notesY);
  doc.setFont("helvetica", "normal");
  const notes = String(draft?.notes || "Cotizacion preliminar sujeta a validacion tecnica, inventario y condiciones comerciales vigentes.");
  const noteLines = doc.splitTextToSize(notes, 180);
  doc.text(noteLines, 14, notesY + 5);

  const pdfBase64 = Buffer.from(doc.output("arraybuffer")).toString("base64");
  const fileName = `cotizacion-${String(draftId || "").slice(0, 8)}.pdf`;
  return { pdfBase64, fileName };
}
