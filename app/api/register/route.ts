import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";

// Base de datos simulada en memoria
let leads: any[] = [];

/**
 * POST -> Registrar un nuevo lead
 * Endpoint: /api/register
 */
export async function POST(req: Request) {
  try {
    const { nombre, email, empresa, telefono, interes } = await req.json();

    if (!nombre || !email || !empresa) {
      return NextResponse.json(
        { success: false, message: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    const leadId = `demo-${uuidv4().substring(0, 8)}`;

    const newLead = {
      lead_id: leadId,
      nombre,
      email,
      empresa,
      telefono: telefono || "No proporcionado",
      interes: interes || "Demo Tracker",
      status: "nuevo",
      timestamp: new Date().toISOString(),
    };

    leads.push(newLead);

    console.log("✅ Lead registrado:", newLead);

    return NextResponse.json({
      success: true,
      leadId,
      message: "Lead registrado correctamente",
    });
  } catch (error) {
    console.error("❌ Error al registrar lead:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

/**
 * GET -> Obtener todos los leads
 * Endpoint: /api/register
 */
export async function GET() {
  return NextResponse.json(leads);
}

/**
 * PATCH -> Actualizar estado de un lead
 * Endpoint: /api/register
 * Body esperado: { leadId: string, status: string }
 */
export async function PATCH(req: Request) {
  try {
    const { leadId, status } = await req.json();

    const index = leads.findIndex((l) => l.lead_id === leadId);
    if (index === -1) {
      return NextResponse.json(
        { success: false, message: "Lead no encontrado" },
        { status: 404 }
      );
    }

    leads[index].status = status;

    console.log(`🔄 Estado actualizado -> ${leadId}: ${status}`);

    return NextResponse.json({
      success: true,
      lead: leads[index],
      message: "Estado actualizado correctamente",
    });
  } catch (error) {
    console.error("❌ Error al actualizar lead:", error);
    return NextResponse.json(
      { success: false, message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
