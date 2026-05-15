import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    metrics: [
      { id: "ventas_netas", formula: "SUM(revenue)" },
      { id: "unidades", formula: "SUM(quantity)" },
      { id: "ticket_promedio", formula: "SUM(revenue)/COUNT_DISTINCT(customer)" },
      { id: "clientes_activos", formula: "COUNT_DISTINCT(customer)" },
    ],
  });
}
