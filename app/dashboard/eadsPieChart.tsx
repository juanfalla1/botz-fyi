"use client";
import React, { useMemo } from "react";
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from "recharts";

type Lead = {
  id: string;
  status?: string;
};

export default function LeadsPieChart({ leads }: { leads: Lead[] }) {
  const data = useMemo(() => {
    const counts = { new: 0, seguimiento: 0, convertido: 0 };

    leads.forEach((lead) => {
      if (lead.status === "seguimiento") counts.seguimiento++;
      else if (lead.status === "convertido") counts.convertido++;
      else counts.new++;
    });

    return [
      { name: "Nuevo", value: counts.new },
      { name: "En seguimiento", value: counts.seguimiento },
      { name: "Convertido", value: counts.convertido },
    ];
  }, [leads]);

  const COLORS = ["#3b82f6", "#facc15", "#22c55e"];

  return (
    <div className="bg-white p-4 rounded-lg shadow-md mt-6">
      <h2 className="text-xl font-bold mb-4">Gestión General</h2>
      <ResponsiveContainer width="100%" height={250}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" outerRadius={90} dataKey="value" label>
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
