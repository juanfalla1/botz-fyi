export type PlantillaConfig = {
  time_setup: {
    country: string;
    days: string;
    startHourWeekdays: string;
    endHourWeekdays: string;
    startHourWeekend: string;
    endHourWeekend: string;
  };
  phone_call: {
    from_number: string;
    to_number: string;
    agent_id: string;
    variables: Array<{ key: string; value: string }>;
  };
  sheets: {
    document: string;
    sheet: string;
    status_filter: string;
  };
  wait: {
    time_in_seconds: string;
  };
};

export const plantillaParaLlamar = {
  id: "plantilla_para_llamar",
  name: "plantilla_para_llamar",
  description: "Llama una lista de contactos y registra el resultado.",
  config: {
    time_setup: {
      country: "usa",
      days: "5",
      startHourWeekdays: "8",
      endHourWeekdays: "20",
      startHourWeekend: "8",
      endHourWeekend: "18",
    },
    phone_call: {
      from_number: "+17542622976",
      to_number: "+1{{parse_contact.formatPhone}}",
      agent_id: "agent_f9cbc45ed918636998458f21de",
      variables: [{ key: "contact_name", value: "{{parse_contact.name}}" }],
    },
    sheets: {
      document: "1nzAqKn0fpyIo4qoPr-7-Tp97tJ8zy8Sg7HX5gtuJN3o",
      sheet: "NO TOCAR",
      status_filter: "On",
    },
    wait: {
      time_in_seconds: "10",
    },
  } as PlantillaConfig,
  nodes: [
    { id: "start", label: "Start", sub: "SCHEDULED TASK", x: 520, y: 120, accent: "lime" as const },
    { id: "time_setup", label: "Custom Time Setup", sub: "SETUP", x: 880, y: 140 },
    { id: "cond_time", label: "Conditional", sub: "LOGIC", x: 880, y: 280 },
    { id: "get_rows", label: "Get Rows", sub: "GOOGLE_SHEETS", x: 520, y: 260 },
    { id: "loop", label: "Loop List", sub: "LOGIC", x: 520, y: 400 },
    { id: "parse", label: "parse_contact", sub: "CODE", x: 820, y: 560 },
    { id: "call", label: "dapta_phone_call", sub: "VOICE_AGENT", x: 820, y: 720, accent: "blue" as const },
    { id: "if_error", label: "if_error", sub: "CONDITIONAL", x: 520, y: 720 },
    { id: "wait", label: "Wait", sub: "TIME", x: 520, y: 860 },
    { id: "done", label: "Response", sub: "OUTPUT", x: 1120, y: 400 },
  ],
  edges: [
    { from: "start", to: "time_setup" },
    { from: "time_setup", to: "cond_time" },
    { from: "start", to: "get_rows" },
    { from: "get_rows", to: "loop" },
    { from: "loop", to: "parse", label: "Loop" },
    { from: "parse", to: "call" },
    { from: "call", to: "if_error" },
    { from: "if_error", to: "wait", label: "True" },
    { from: "if_error", to: "loop", label: "False" },
    { from: "loop", to: "done", label: "Done" },
  ],
};
