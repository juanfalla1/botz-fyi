import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";
import { getRequestUser } from "@/app/api/_utils/auth";
import { getAnonSupabaseWithToken } from "@/app/api/_utils/supabase";

export const runtime = "nodejs";

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

function buildQuotePdf(args: {
  companyName: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  productName: string;
  quantity: number;
  basePriceUsd: number;
  trmRate: number;
  totalCop: number;
  notes?: string;
}) {
  const doc = new jsPDF();
  const now = new Date();
  const quoteNumber = `Q-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}${String(now.getDate()).padStart(2, "0")}-${String(now.getHours()).padStart(2, "0")}${String(now.getMinutes()).padStart(2, "0")}`;

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

  row("Empresa", args.companyName || "Avanza Balanzas");
  row("Cliente", args.customerName || "-");
  row("Correo", args.customerEmail || "-");
  row("Telefono", printablePhone(args.customerPhone || ""));
  row("Producto", args.productName || "-");
  row("Cantidad", String(args.quantity || 1));
  row("Precio base USD", args.basePriceUsd > 0 ? formatMoney(args.basePriceUsd) : "-");
  row("TRM", args.trmRate > 0 ? formatMoney(args.trmRate) : "-");
  row("Total COP", args.totalCop > 0 ? formatMoney(args.totalCop) : "-");

  y += 4;
  doc.setFont("helvetica", "bold");
  doc.text("Notas:", 14, y);
  doc.setFont("helvetica", "normal");
  const notes = String(args.notes || "Cotizacion preliminar sujeta a validacion tecnica, inventario y condiciones comerciales vigentes.");
  const lines = doc.splitTextToSize(notes, 180);
  doc.text(lines, 14, y + 5);

  return Buffer.from(doc.output("arraybuffer")).toString("base64");
}

export async function POST(req: Request) {
  const guard = await getRequestUser(req);
  if (!guard.ok) return NextResponse.json({ ok: false, error: guard.error }, { status: 401 });

  const supabase = getAnonSupabaseWithToken(guard.token);
  if (!supabase) return NextResponse.json({ ok: false, error: "Missing Supabase env" }, { status: 500 });

  try {
    const body = await req.json().catch(() => ({}));
    const draftId = String(body?.draftId || "").trim();
    if (!draftId) return NextResponse.json({ ok: false, error: "Missing draftId" }, { status: 400 });

    const { data: draft, error } = await supabase
      .from("agent_quote_drafts")
      .select("*")
      .eq("id", draftId)
      .eq("created_by", guard.user.id)
      .maybeSingle();

    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
    if (!draft) return NextResponse.json({ ok: false, error: "Draft no encontrado" }, { status: 404 });

    const payload = (draft as any).payload || {};
    const quantity = Number(payload?.quantity || 1);
    const pdfBase64 = buildQuotePdf({
      companyName: String((draft as any).company_name || "Avanza Balanzas"),
      customerName: String((draft as any).customer_name || ""),
      customerEmail: String((draft as any).customer_email || ""),
      customerPhone: String((draft as any).customer_phone || ""),
      productName: String((draft as any).product_name || ""),
      quantity,
      basePriceUsd: Number((draft as any).base_price_usd || 0),
      trmRate: Number((draft as any).trm_rate || 0),
      totalCop: Number((draft as any).total_cop || 0),
      notes: String((draft as any).notes || ""),
    });

    const fileName = `cotizacion-${draftId.slice(0, 8)}.pdf`;
    return NextResponse.json({ ok: true, data: { draftId, fileName, pdfBase64 } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || "Unknown error" }, { status: 500 });
  }
}
