type FlowNode = {
  id: string;
  label?: string;
  sub?: string;
};

type FlowEdge = {
  from: string;
  to: string;
  label?: string;
};

export type FlowExecutionStep = {
  ts: string;
  node_id: string;
  label: string;
  sub: string;
  status: "ok" | "error";
  message: string;
  data?: any;
};

export type FlowExecution = {
  id: string;
  mode: "test" | "run";
  status: "ok" | "error";
  started_at: string;
  finished_at: string;
  duration_ms: number;
  steps: FlowExecutionStep[];
  output?: any;
};

type ExecuteArgs = {
  nodes: FlowNode[];
  edges: FlowEdge[];
  nodeConfigs?: Record<string, any>;
  templateConfig?: any;
  mode: "test" | "run";
};

function nowIso() {
  return new Date().toISOString();
}

function subKey(sub: any) {
  return String(sub || "")
    .trim()
    .replace(/\s+/g, "_")
    .toUpperCase();
}

function safeGet(obj: any, path: string) {
  if (!obj || !path) return undefined;
  const parts = path.split(".");
  let cur = obj;
  for (const p of parts) {
    if (cur == null) return undefined;
    cur = cur[p];
  }
  return cur;
}

function interpolate(template: string, ctx: any) {
  return template.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, p1) => {
    const v = safeGet(ctx, p1);
    return v == null ? "" : String(v);
  });
}

function edgeLabelKey(label: any) {
  return String(label || "")
    .trim()
    .toLowerCase();
}

function pickEdge(edges: FlowEdge[], preferredLabels: string[]) {
  for (const want of preferredLabels) {
    const e = edges.find(x => edgeLabelKey(x.label) === want);
    if (e) return e;
  }
  return edges[0];
}

function randFromSeeded(seed: number) {
  // Simple LCG for deterministic-ish test runs
  let x = seed % 2147483647;
  if (x <= 0) x += 2147483646;
  return () => (x = (x * 16807) % 2147483647) / 2147483647;
}

export function executeFlow(args: ExecuteArgs): FlowExecution {
  const started = Date.now();
  const execId = globalThis.crypto?.randomUUID?.() || `exec_${Date.now()}`;

  const nodesById = new Map<string, FlowNode>();
  for (const n of args.nodes || []) nodesById.set(n.id, n);

  const outByFrom = new Map<string, FlowEdge[]>();
  for (const e of args.edges || []) {
    const list = outByFrom.get(e.from) || [];
    list.push(e);
    outByFrom.set(e.from, list);
  }

  const steps: FlowExecutionStep[] = [];
  const ctx: any = { vars: {} };
  const nodeConfigs = args.nodeConfigs || {};
  const templateConfig = args.templateConfig || {};

  const startNode =
    args.nodes.find(n => n.id === "start") ||
    args.nodes.find(n => /\bstart\b/i.test(String(n.label || ""))) ||
    args.nodes.find(n => subKey(n.sub) === "SCHEDULED_TASK") ||
    args.nodes[0];

  if (!startNode) {
    const finishedAt = Date.now();
    return {
      id: execId,
      mode: args.mode,
      status: "error",
      started_at: nowIso(),
      finished_at: nowIso(),
      duration_ms: finishedAt - started,
      steps: [
        {
          ts: nowIso(),
          node_id: "(none)",
          label: "(none)",
          sub: "(none)",
          status: "error",
          message: "Flow has no nodes",
        },
      ],
    };
  }

  const rng = randFromSeeded(started);

  const queue: string[] = [startNode.id];
  const loopState: Record<string, { idx: number; items: any[] }> = {};
  const maxSteps = 200;

  function log(node: FlowNode, status: "ok" | "error", message: string, data?: any) {
    steps.push({
      ts: nowIso(),
      node_id: node.id,
      label: String(node.label || node.id),
      sub: String(node.sub || ""),
      status,
      message,
      data,
    });
  }

  function getNodeConfig(nodeId: string) {
    const cfg = nodeConfigs[nodeId];
    if (cfg && typeof cfg === "object") return cfg;

    // Back-compat: map plantilla config to node ids if present
    if (nodeId === "time_setup" && templateConfig.time_setup) return templateConfig.time_setup;
    if ((nodeId === "call" || /call/i.test(nodeId)) && templateConfig.phone_call) return templateConfig.phone_call;
    if ((nodeId === "get_rows" || /rows/i.test(nodeId)) && templateConfig.sheets) return templateConfig.sheets;
    if (nodeId === "wait" && templateConfig.wait) return templateConfig.wait;
    return {};
  }

  function nextFrom(nodeId: string, preferred: string[] = []) {
    const outs = (outByFrom.get(nodeId) || []).slice();
    if (outs.length === 0) return undefined;
    if (preferred.length > 0) return pickEdge(outs, preferred);
    return outs[0];
  }

  try {
    let i = 0;
    while (queue.length > 0 && i < maxSteps) {
      i++;
      const nodeId = queue.shift() as string;
      const node = nodesById.get(nodeId);
      if (!node) continue;

      const key = subKey(node.sub);
      const cfg = getNodeConfig(node.id);

      if (node.id === startNode.id) {
        log(node, "ok", "Trigger received");
        const outs = outByFrom.get(node.id) || [];
        for (const e of outs) queue.push(e.to);
        continue;
      }

      if (key === "GOOGLE_SHEETS") {
        const mockRows = cfg?.mock_rows;
        const rows = Array.isArray(mockRows)
          ? mockRows
          : [
              { name: "Ada", phone: "+17545550101" },
              { name: "Bruno", phone: "+17545550102" },
              { name: "Cami", phone: "+17545550103" },
            ];
        ctx.rows = rows;
        log(node, "ok", `Fetched ${rows.length} rows (mock)`, { rows_preview: rows.slice(0, 3) });
        const e = nextFrom(node.id);
        if (e) queue.push(e.to);
        continue;
      }

      if (key === "LOGIC" && /loop/i.test(String(node.label || ""))) {
        const state = loopState[node.id] || { idx: 0, items: [] as any[] };
        if (!loopState[node.id]) {
          const items = Array.isArray(ctx.rows) ? ctx.rows : Array.isArray(cfg?.items) ? cfg.items : [1, 2, 3];
          state.items = items;
          state.idx = 0;
          loopState[node.id] = state;
          log(node, "ok", `Loop initialized (${items.length} items)`);
        }

        if (state.idx < state.items.length) {
          ctx.item = state.items[state.idx];
          log(node, "ok", `Loop item ${state.idx + 1}/${state.items.length}`, { item: ctx.item });
          state.idx++;
          const e = nextFrom(node.id, ["loop"]);
          if (e) queue.push(e.to);
        } else {
          log(node, "ok", "Loop done");
          const e = nextFrom(node.id, ["done"]);
          if (e) queue.push(e.to);
        }
        continue;
      }

      if (key === "CODE") {
        // MVP: implement one known transformation without eval
        if (/parse_contact/i.test(String(node.label || node.id))) {
          const phoneRaw = String(ctx.item?.phone || ctx.item?.Phone || ctx.item?.telefono || "");
          const formatPhone = phoneRaw.replace(/[^+\d]/g, "");
          const parsed = {
            name: String(ctx.item?.name || ctx.item?.Name || ""),
            phone: phoneRaw,
            formatPhone,
          };
          ctx.parse_contact = parsed;
          log(node, "ok", "Parsed contact", parsed);
        } else {
          log(node, "ok", "Code executed (mock)");
        }
        const e = nextFrom(node.id);
        if (e) queue.push(e.to);
        continue;
      }

      if (key === "VOICE_AGENT" || key === "DAPTA_PHONECALL") {
        const from = cfg?.from_number ? interpolate(String(cfg.from_number), ctx) : "(from)";
        const to = cfg?.to_number ? interpolate(String(cfg.to_number), ctx) : "(to)";
        const agentId = cfg?.agent_id ? interpolate(String(cfg.agent_id), ctx) : "(agent)";
        const vars = Array.isArray(cfg?.variables)
          ? cfg.variables.map((v: any) => ({ key: v.key, value: interpolate(String(v.value || ""), ctx) }))
          : [];
        ctx.last_call = { from, to, agent_id: agentId, variables: vars };
        log(node, "ok", `Outbound call (mock) to ${to}`, ctx.last_call);
        const e = nextFrom(node.id);
        if (e) queue.push(e.to);
        continue;
      }

      if (key === "TIME") {
        const seconds = Number(cfg?.time_in_seconds || cfg?.seconds || 1);
        log(node, "ok", `Wait ${Number.isFinite(seconds) ? seconds : 1}s (mock)`);
        const e = nextFrom(node.id);
        if (e) queue.push(e.to);
        continue;
      }

      if (key === "CONDITIONAL" || /conditional/i.test(String(node.label || "")) || /if_error/i.test(String(node.label || ""))) {
        const pError = Number(cfg?.error_rate ?? 0);
        const isError = /if_error/i.test(String(node.label || "")) ? (rng() < (Number.isFinite(pError) ? pError : 0)) : false;
        const branch = isError ? "true" : "false";
        log(node, "ok", `Branch ${branch.toUpperCase()}`);
        const e = nextFrom(node.id, [branch]);
        if (e) queue.push(e.to);
        continue;
      }

      if (key === "OUTPUT") {
        const out = cfg?.response ?? ctx.last_call ?? { ok: true };
        log(node, "ok", "Flow finished", out);
        const finishedAt = Date.now();
        return {
          id: execId,
          mode: args.mode,
          status: "ok",
          started_at: new Date(started).toISOString(),
          finished_at: new Date(finishedAt).toISOString(),
          duration_ms: finishedAt - started,
          steps,
          output: out,
        };
      }

      // Default: pass-through
      log(node, "ok", "Executed");
      const e = nextFrom(node.id);
      if (e) queue.push(e.to);
    }

    const finishedAt = Date.now();
    return {
      id: execId,
      mode: args.mode,
      status: "ok",
      started_at: new Date(started).toISOString(),
      finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - started,
      steps,
      output: { ok: true, note: "Reached end of queue" },
    };
  } catch (e: any) {
    const finishedAt = Date.now();
    return {
      id: execId,
      mode: args.mode,
      status: "error",
      started_at: new Date(started).toISOString(),
      finished_at: new Date(finishedAt).toISOString(),
      duration_ms: finishedAt - started,
      steps: steps.concat([
        {
          ts: nowIso(),
          node_id: "(engine)",
          label: "(engine)",
          sub: "(engine)",
          status: "error",
          message: e?.message || "Unknown engine error",
        },
      ]),
    };
  }
}
