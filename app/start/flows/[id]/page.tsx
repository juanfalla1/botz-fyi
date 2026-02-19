"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/app/supabaseClient";
import AuthModal from "@/app/start/components/AuthModal";
import { authedFetch as authedFetchUtil, AuthRequiredError } from "@/app/start/_utils/authedFetch";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type Node as RFNode,
  type Edge as RFEdge,
  type Connection,
  type NodeTypes,
  type OnConnect,
  type ReactFlowInstance,
  Handle,
  Position,
  MarkerType,
  Panel,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

/* ═══════ constants ═══════ */
const C = {
  bg: "#1a1d26",
  sidebar: "#15181f",
  card: "#22262d",
  dark: "#111318",
  border: "rgba(255,255,255,0.12)",
  blue: "#0096ff",
  lime: "#a3e635",
  white: "#ffffff",
  muted: "#9ca3af",
  dim: "#6b7280",
};

const NODE_ICONS: Record<string, string> = {
  SCHEDULED_TASK: "⚡",
  SETUP: "🕐",
  LOGIC: "◇",
  GOOGLE_SHEETS: "📗",
  CODE: "</>",
  VOICE_AGENT: "📞",
  BOTZ_PHONECALL: "📞",
  TIME: "⏳",
  OUTPUT: "→",
  ACTION: "⚙",
  CONDITIONAL: "◇",
  OPENAI: "🤖",
  WHATSAPP: "💬",
  NOTION: "🗒️",
  WEBHOOK: "🔗",
  CREDITS_BY_AGENT: "💳",
};

/* ═══════ Available actions catalog ═══════ */
type ActionCategory = { name: string; icon: string; items: ActionItem[] };
type ActionItem = { id: string; label: string; sub: string; icon: string; desc: string };

const ACTION_CATALOG: ActionCategory[] = [
  {
    name: "AI Nodes", icon: "✨",
    items: [
      { id: "openai", label: "OpenAI", sub: "OPENAI", icon: "🤖", desc: "GPT completions, embeddings" },
      { id: "voice_agent", label: "Voice Agent Call", sub: "VOICE_AGENT", icon: "📞", desc: "Botz/Vapi phone call" },
      { id: "botz_phonecall", label: "Botz Phone Call", sub: "BOTZ_PHONECALL", icon: "📞", desc: "Make outbound call via Botz" },
      { id: "text_agent", label: "Text Agent", sub: "TEXT_AGENT", icon: "💬", desc: "Text-based AI agent" },
    ],
  },
  {
    name: "Data Nodes", icon: "🗄️",
    items: [
      { id: "google_sheets", label: "Google Sheets", sub: "GOOGLE_SHEETS", icon: "📗", desc: "Read/write rows" },
      { id: "code", label: "Code", sub: "CODE", icon: "</>", desc: "Run custom JavaScript" },
      { id: "database", label: "Database", sub: "DATABASE", icon: "🗃️", desc: "Query your database" },
    ],
  },
  {
    name: "Integration Actions", icon: "🔌",
    items: [
      { id: "whatsapp", label: "Send WhatsApp", sub: "WHATSAPP", icon: "💬", desc: "Send WhatsApp template message" },
      { id: "webhook", label: "Webhook", sub: "WEBHOOK", icon: "🔗", desc: "Call external webhook" },
      { id: "notion", label: "Notion", sub: "NOTION", icon: "🗒️", desc: "Create/update Notion pages" },
      { id: "gmail", label: "Gmail", sub: "GMAIL", icon: "📧", desc: "Send email via Gmail" },
      { id: "hubspot", label: "HubSpot", sub: "HUBSPOT", icon: "🟠", desc: "CRM operations" },
    ],
  },
  {
    name: "Flow Actions", icon: "🔀",
    items: [
      { id: "conditional", label: "Conditional", sub: "CONDITIONAL", icon: "◇", desc: "If/else branching" },
      { id: "loop", label: "Loop List", sub: "LOGIC", icon: "🔁", desc: "Iterate over a list" },
      { id: "wait", label: "Wait", sub: "TIME", icon: "⏳", desc: "Pause for N seconds" },
      { id: "response", label: "Response", sub: "OUTPUT", icon: "→", desc: "End flow with response" },
      { id: "time_setup", label: "Custom Time Setup", sub: "SETUP", icon: "🕐", desc: "Configure schedule/timezone" },
      { id: "trigger", label: "Trigger", sub: "SCHEDULED_TASK", icon: "⚡", desc: "Cron or webhook trigger" },
      { id: "credits", label: "Credits by Agent", sub: "CREDITS_BY_AGENT", icon: "💳", desc: "Track credit usage" },
      { id: "if_error", label: "If Error", sub: "CONDITIONAL", icon: "⚠", desc: "Handle errors" },
      { id: "return_loop", label: "Return to Loop", sub: "LOGIC", icon: "↩", desc: "Return to parent loop" },
    ],
  },
];

/* ═══════ Custom Node ═══════ */
function FlowNode({ data, selected }: { data: any; selected?: boolean }) {
  const key = String(data?.sub || "").trim().replace(/\s+/g, "_").toUpperCase();
  const icon = NODE_ICONS[key] || NODE_ICONS[String(data?.sub || "")] || "⚙";
  return (
    <div
      style={{
        backgroundColor: C.card,
        border: `2px solid ${selected ? C.lime : C.border}`,
        borderRadius: 14,
        padding: 0,
        minWidth: 220,
        maxWidth: 280,
        boxShadow: selected ? `0 0 18px ${C.lime}33` : "0 8px 24px rgba(0,0,0,.4)",
        overflow: "visible",
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: C.dim, width: 10, height: 10, border: `2px solid ${C.border}` }} />
      <Handle type="target" position={Position.Left} id="left" style={{ background: C.dim, width: 10, height: 10, border: `2px solid ${C.border}` }} />

      <div style={{ height: 3, backgroundColor: data.accent || C.lime, borderRadius: "14px 14px 0 0" }} />
      <div style={{ padding: "12px 14px 10px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>{icon}</span>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontWeight: 900, fontSize: 14, color: C.white, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{data.label}</div>
          <div style={{ fontSize: 11, color: C.dim, fontWeight: 800, marginTop: 2 }}>{String(data.sub || key)}</div>
        </div>
        <button style={{ marginLeft: "auto", background: "none", border: "none", color: C.muted, cursor: "pointer", fontWeight: 900, flexShrink: 0 }}>⋮</button>
      </div>

      <Handle type="source" position={Position.Bottom} style={{ background: C.lime, width: 10, height: 10, border: `2px solid ${C.dark}` }} />
      <Handle type="source" position={Position.Right} id="right" style={{ background: C.lime, width: 10, height: 10, border: `2px solid ${C.dark}` }} />
    </div>
  );
}

const nodeTypes: NodeTypes = { flowNode: FlowNode };

/* ═══════ Sidebar tabs ═══════ */
type SidebarTab = "actions" | "executions" | "settings" | "flows" | "vault" | "docs";
const SIDEBAR_ITEMS: { id: SidebarTab; label: string; icon: string }[] = [
  { id: "actions", label: "Actions", icon: "+" },
  { id: "executions", label: "Executions", icon: "📋" },
  { id: "settings", label: "Settings", icon: "⚙" },
  { id: "flows", label: "Flows List", icon: "🔀" },
  { id: "vault", label: "Vault", icon: "🔒" },
  { id: "docs", label: "Documentation", icon: "?" },
];

/* ═══════ Main Component ═══════ */
export default function FlowEditorPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openAuth, setOpenAuth] = useState(false);
  const [running, setRunning] = useState<"test" | "run" | null>(null);
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>("actions");
  const [actionsOpen, setActionsOpen] = useState(false);
  const [actionCategory, setActionCategory] = useState<string | null>(null);
  const [actionSearch, setActionSearch] = useState("");
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [executions, setExecutions] = useState<any[]>([]);
  const [selectedExecutionId, setSelectedExecutionId] = useState<string | null>(null);
  const [rfInstance, setRfInstance] = useState<ReactFlowInstance | null>(null);

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<RFEdge>([]);

  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const { data } = await supabase.auth.getSession();
      const u = data?.session?.user || null;
      if (!mounted) return;
      setOpenAuth(!u);
    })();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setOpenAuth(!session?.user);
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe();
    };
  }, []);

  const authedFetch = useCallback(async (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      return await authedFetchUtil(input, init);
    } catch (e) {
      if (e instanceof AuthRequiredError) setOpenAuth(true);
      throw e;
    }
  }, []);

  /* ── load ── */
  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        const res = await authedFetch(`/api/flows/get?id=${id}`);
        const json = await res.json();
        if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo cargar");
        const data = json.data;
        setAgent(data);

        const rawNodes = data?.configuration?.flow?.nodes || [];
        const rawEdges = data?.configuration?.flow?.edges || [];
        const nodeConfigs = (data?.configuration?.flow?.node_configs && typeof data?.configuration?.flow?.node_configs === "object")
          ? data.configuration.flow.node_configs
          : {};
        const templateCfg = (data?.configuration?.flow?.template_config && typeof data?.configuration?.flow?.template_config === "object")
          ? data.configuration.flow.template_config
          : {};
        const execs = Array.isArray(data?.configuration?.flow?.executions) ? data.configuration.flow.executions : [];
        setExecutions(execs);

        const rfNodes: RFNode[] = rawNodes.map((n: any) => ({
          id: n.id,
          type: "flowNode",
          position: { x: n.x || 0, y: n.y || 0 },
          data: {
            label: n.label,
            sub: n.sub,
            accent: n.accent === "lime" ? C.lime : n.accent === "blue" ? C.blue : n.accent === "purple" ? "#a78bfa" : C.lime,
            config: nodeConfigs?.[n.id]
              ?? (n.id === "time_setup" ? templateCfg?.time_setup
              : n.id === "get_rows" ? templateCfg?.sheets
              : n.id === "wait" ? templateCfg?.wait
              : (n.id === "call" || /call/i.test(String(n.id))) ? templateCfg?.phone_call
              : undefined),
          },
          selected: false,
        }));

        const rfEdges: RFEdge[] = rawEdges.map((e: any, i: number) => ({
          id: `e-${i}`,
          source: e.from,
          target: e.to,
          label: e.label || "",
          type: "smoothstep",
          animated: !!e.label,
          style: { stroke: e.label?.toLowerCase() === "true" ? C.lime : e.label?.toLowerCase() === "false" ? "#ef4444" : e.label?.toLowerCase() === "loop" ? "#fbbf24" : e.label?.toLowerCase() === "done" ? "#84cc16" : "rgba(255,255,255,0.35)", strokeWidth: 2 },
          labelStyle: { fill: e.label?.toLowerCase() === "true" ? C.lime : e.label?.toLowerCase() === "false" ? "#ef4444" : e.label?.toLowerCase() === "loop" ? "#fbbf24" : "#84cc16", fontWeight: 900, fontSize: 13 },
          markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.5)" },
        }));

        setNodes(rfNodes);
        setEdges(rfEdges);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, [id, authedFetch]);

  /* ── auto-save ── */
  const persistFlow = useCallback(async (nextNodes: RFNode[], nextEdges: RFEdge[]) => {
    if (!agent) return;
    const nodesData = nextNodes.map(n => ({
      id: n.id,
      label: n.data.label,
      sub: n.data.sub,
      x: n.position.x,
      y: n.position.y,
      accent: n.data.accent === C.lime ? "lime" : n.data.accent === C.blue ? "blue" : undefined,
    }));
    const edgesData = nextEdges.map(e => ({
      from: e.source,
      to: e.target,
      label: e.label || undefined,
    }));

    const nodeConfigs: Record<string, any> = {};
    for (const n of nextNodes as any[]) {
      if (n?.data?.config && typeof n.data.config === "object") {
        nodeConfigs[n.id] = n.data.config;
      }
    }

    const nextCfg = { ...(agent.configuration || {}) };
    nextCfg.flow = { ...(nextCfg.flow || {}), nodes: nodesData, edges: edgesData, node_configs: nodeConfigs };
    try {
      const res = await authedFetch("/api/flows/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agent.id, patch: { configuration: nextCfg } }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setAgent({ ...agent, configuration: nextCfg });
        setSaving(false);
      }
    } catch (e) {
      console.error(e);
    }
  }, [agent, authedFetch]);

  const scheduleSave = useCallback((n: RFNode[], e: RFEdge[]) => {
    setSaving(true);
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => persistFlow(n, e), 1200);
  }, [persistFlow]);

  /* ── connect ── */
  const onConnect: OnConnect = useCallback((connection: Connection) => {
    const newEdge: RFEdge = {
      ...connection,
      id: `e-${Date.now()}`,
      type: "smoothstep",
      animated: false,
      style: { stroke: "rgba(255,255,255,0.35)", strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.5)" },
    } as RFEdge;
    setEdges(eds => {
      const next = addEdge(newEdge, eds);
      scheduleSave(nodes, next);
      return next;
    });
  }, [setEdges, nodes, scheduleSave]);

  /* ── node drag stop ── */
  const onNodeDragStop = useCallback((_: any, __: RFNode) => {
    scheduleSave(nodes, edges);
  }, [nodes, edges, scheduleSave]);

  /* ── node click ── */
  const onNodeClick = useCallback((_: any, node: RFNode) => {
    setSelectedNodeId(node.id);
    setActionsOpen(false);
  }, []);

  /* ── add node from catalog ── */
  const addNodeFromCatalog = useCallback((item: ActionItem) => {
    const newId = `${item.id}_${Date.now()}`;
    const newNode: RFNode = {
      id: newId,
      type: "flowNode",
      position: { x: 400 + Math.random() * 200, y: 300 + Math.random() * 200 },
      data: { label: item.label, sub: item.sub, accent: C.lime, config: {} },
    };
    setNodes(nds => {
      const next = [...nds, newNode];
      scheduleSave(next, edges);
      return next;
    });
    setSelectedNodeId(newId);
    setActionsOpen(false);
    setActionCategory(null);
  }, [setNodes, edges, scheduleSave]);

  const runFlow = useCallback(async (mode: "test" | "run") => {
    if (!agent?.id) return;
    setRunning(mode);
    try {
      // Ensure the latest canvas state is persisted before executing.
      if (saveTimeout.current) {
        clearTimeout(saveTimeout.current);
        saveTimeout.current = null;
      }
      await persistFlow(nodes, edges);

      const res = await authedFetch("/api/flows/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: agent.id, mode }),
      });
      const json = await res.json();
      if (!res.ok || !json?.ok) throw new Error(json?.error || "No se pudo ejecutar");

      const exec = json.execution;
      setExecutions(prev => [exec, ...prev].slice(0, 50));
      setSelectedExecutionId(exec.id);
      setSidebarTab("executions");
      setActionsOpen(false);
      setSelectedNodeId(null);
    } catch (e: any) {
      console.error(e);
      alert(`No se pudo ejecutar el flujo: ${e?.message || "Unknown error"}`);
    } finally {
      setRunning(null);
    }
  }, [agent?.id, edges, nodes, persistFlow, authedFetch]);

  /* ── delete node ── */
  const deleteSelectedNode = useCallback(() => {
    if (!selectedNodeId) return;
    setNodes(nds => {
      const next = nds.filter(n => n.id !== selectedNodeId);
      setEdges(eds => {
        const nextEdges = eds.filter(e => e.source !== selectedNodeId && e.target !== selectedNodeId);
        scheduleSave(next, nextEdges);
        return nextEdges;
      });
      return next;
    });
    setSelectedNodeId(null);
  }, [selectedNodeId, setNodes, setEdges, scheduleSave]);

  /* ── filtered actions ── */
  const filteredActions = useMemo(() => {
    const q = actionSearch.trim().toLowerCase();
    if (actionCategory) {
      const cat = ACTION_CATALOG.find(c => c.name === actionCategory);
      if (!cat) return [];
      return q ? cat.items.filter(i => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q)) : cat.items;
    }
    if (!q) return [];
    return ACTION_CATALOG.flatMap(c => c.items).filter(i => i.label.toLowerCase().includes(q) || i.desc.toLowerCase().includes(q));
  }, [actionCategory, actionSearch]);

  const selectedNode = useMemo(() => nodes.find(n => n.id === selectedNodeId) as (RFNode & { data: any }) | undefined, [nodes, selectedNodeId]);
  const selectedExecution = useMemo(() => executions.find(e => e?.id === selectedExecutionId), [executions, selectedExecutionId]);

  const onDragOverCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  }, []);

  const onDropCanvas = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const raw = event.dataTransfer.getData("application/x-botz-action");
    if (!raw) return;
    try {
      const item = JSON.parse(raw) as ActionItem;
      const pos = rfInstance?.screenToFlowPosition({ x: event.clientX, y: event.clientY }) || { x: 420, y: 260 };
      const newId = `${item.id}_${Date.now()}`;
      const newNode: RFNode = {
        id: newId,
        type: "flowNode",
        position: pos,
        data: { label: item.label, sub: item.sub, accent: C.lime, config: {} },
      };
      setNodes(nds => {
        const next = [...nds, newNode];
        scheduleSave(next, edges);
        return next;
      });
      setSelectedNodeId(newId);
      setActionsOpen(false);
      setActionCategory(null);
    } catch {
      // ignore
    }
  }, [rfInstance, setNodes, scheduleSave, edges]);

  /* ═══════ RENDER ═══════ */
  if (loading) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,-apple-system,sans-serif", color: C.white }}>
        Cargando flujo...
      </div>
    );
  }

  if (!agent) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: C.bg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "Inter,-apple-system,sans-serif", color: C.white }}>
        Flujo no encontrado
      </div>
    );
  }

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", backgroundColor: C.bg, fontFamily: "Inter,-apple-system,sans-serif", color: C.white }}>

      <AuthModal
        open={openAuth}
        onClose={() => {
          setOpenAuth(false);
          router.push("/");
        }}
        onLoggedIn={() => {
          setOpenAuth(false);
        }}
        redirectTo={typeof window !== "undefined" ? `${window.location.origin}/start/flows/${id}` : undefined}
      />
      {/* ── top bar ── */}
      <div style={{ height: 52, borderBottom: `1px solid ${C.border}`, backgroundColor: C.dark, display: "flex", alignItems: "center", padding: "0 18px", gap: 14, flexShrink: 0 }}>
        <button onClick={() => router.push("/start/agents")} style={{ background: "none", border: "none", color: C.lime, cursor: "pointer", fontWeight: 900, fontSize: 14 }}>
          ← Back
        </button>
        <div style={{ fontWeight: 900, fontSize: 16, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {agent.name}
        </div>
        <span style={{ color: C.dim, fontSize: 13 }}>🕐</span>
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ color: saving ? "#fbbf24" : C.dim, fontSize: 13, fontWeight: 800 }}>
            {saving ? "Saving..." : "✓ Saved"}
          </div>
          <button
            onClick={() => runFlow("test")}
            disabled={!!running}
            style={{ background: "none", border: "none", color: !!running ? C.dim : C.muted, cursor: running ? "not-allowed" : "pointer", fontWeight: 900, fontSize: 14 }}
          >
            {running === "test" ? "⏳ Testing..." : "⚗ Test Flow"}
          </button>
          <button
            onClick={() => runFlow("run")}
            disabled={!!running}
            style={{ padding: "10px 16px", borderRadius: 10, border: "none", backgroundColor: C.lime, color: "#111", fontWeight: 900, cursor: running ? "not-allowed" : "pointer", opacity: running ? 0.75 : 1 }}
          >
            {running === "run" ? "⏳ Running..." : "▶ Run Flow"}
          </button>
        </div>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* ── left sidebar ── */}
        <div style={{ width: 180, backgroundColor: C.sidebar, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", flexShrink: 0 }}>
          {SIDEBAR_ITEMS.map(item => (
            <button
              key={item.id}
              onClick={() => {
                setSidebarTab(item.id);
                if (item.id === "actions") { setActionsOpen(true); setActionCategory(null); }
                else { setActionsOpen(false); }
              }}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "14px 16px", border: "none",
                backgroundColor: sidebarTab === item.id ? `${C.lime}18` : "transparent",
                color: sidebarTab === item.id ? C.white : C.muted,
                cursor: "pointer", fontWeight: 800, fontSize: 13,
                textAlign: "left", width: "100%",
                borderLeft: sidebarTab === item.id ? `3px solid ${C.lime}` : "3px solid transparent",
              }}
            >
              <span style={{ fontSize: 16, width: 22, textAlign: "center" }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>

        {/* ── canvas ── */}
        <div style={{ flex: 1, position: "relative" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onPaneClick={() => { setSelectedNodeId(null); setActionsOpen(false); }}
            onInit={setRfInstance}
            onDragOver={onDragOverCanvas}
            onDrop={onDropCanvas}
            nodeTypes={nodeTypes}
            fitView
            snapToGrid
            snapGrid={[20, 20]}
            style={{ width: "100%", height: "100%" }}
            defaultEdgeOptions={{
              type: "smoothstep",
              style: { stroke: "rgba(255,255,255,0.35)", strokeWidth: 2 },
              markerEnd: { type: MarkerType.ArrowClosed, color: "rgba(255,255,255,0.5)" },
            }}
          >
            <Background color="rgba(255,255,255,0.05)" gap={24} />
            <Controls
              style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12 }}
            />
            <MiniMap
              style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12 }}
              nodeColor={C.card}
              maskColor="rgba(0,0,0,0.6)"
            />

            {selectedNode && (
              <Panel position="bottom-center">
                <div style={{ backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ fontWeight: 900, fontSize: 14 }}>{String(selectedNode.data.label)}</span>
                  <span style={{ color: C.dim, fontSize: 12 }}>{String(selectedNode.data.sub)}</span>
                  <button onClick={deleteSelectedNode} style={{ marginLeft: 12, background: "none", border: "none", color: "#ef4444", cursor: "pointer", fontWeight: 900 }}>
                    Eliminar
                  </button>
                </div>
              </Panel>
            )}
          </ReactFlow>
        </div>

        {/* ── right panel: Actions catalog ── */}
        {actionsOpen && (
          <div style={{ width: 380, backgroundColor: C.sidebar, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
            <div style={{ padding: "16px 16px 8px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              {actionCategory ? (
                <button onClick={() => setActionCategory(null)} style={{ background: "none", border: "none", color: C.lime, cursor: "pointer", fontWeight: 900 }}>
                  ← {actionCategory}
                </button>
              ) : (
                <div style={{ fontWeight: 900, fontSize: 18 }}>Actions</div>
              )}
              <button onClick={() => setActionsOpen(false)} style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", fontSize: 18, fontWeight: 900 }}>×</button>
            </div>

            <div style={{ padding: "4px 16px 12px" }}>
              <input
                value={actionSearch}
                onChange={e => setActionSearch(e.target.value)}
                placeholder="Sheets, HubSpot, Send Message..."
                style={{ width: "100%", boxSizing: "border-box", padding: "11px 14px", backgroundColor: C.dark, border: `1px solid ${C.border}`, borderRadius: 10, color: C.white, fontSize: 13, outline: "none" }}
              />
            </div>

            <div style={{ flex: 1, overflow: "auto", padding: "0 16px 16px" }}>
              {!actionCategory && !actionSearch.trim() && (
                <div style={{ display: "grid", gap: 4 }}>
                  <div style={{ color: C.muted, fontSize: 13, margin: "8px 0 8px" }}>Drag and drop actions to the flow.</div>
                  {ACTION_CATALOG.map(cat => (
                    <button
                      key={cat.name}
                      onClick={() => setActionCategory(cat.name)}
                      style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 12px", borderRadius: 12, border: "none", backgroundColor: C.card, color: C.white, cursor: "pointer", width: "100%" }}
                    >
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span style={{ fontSize: 22 }}>{cat.icon}</span>
                        <div style={{ textAlign: "left" }}>
                          <div style={{ fontWeight: 900, fontSize: 14 }}>{cat.name} ({cat.items.length})</div>
                          <div style={{ color: C.dim, fontSize: 12, marginTop: 2 }}>
                            {cat.name === "AI Nodes" ? "Nodes related to artificial intelligence features" :
                             cat.name === "Data Nodes" ? "Data access and manipulation nodes" :
                             cat.name === "Integration Actions" ? "Third-party service integrations" :
                             "Core flow control and routing nodes"}
                          </div>
                        </div>
                      </div>
                      <span style={{ color: C.lime }}>→</span>
                    </button>
                  ))}
                </div>
              )}

              {(actionCategory || actionSearch.trim()) && (
                <div style={{ display: "grid", gap: 6 }}>
                  {filteredActions.map(item => (
                    <button
                      key={item.id}
                      onClick={() => addNodeFromCatalog(item)}
                      draggable
                      onDragStart={e => {
                        e.dataTransfer.setData("application/x-botz-action", JSON.stringify(item));
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      style={{ display: "flex", alignItems: "flex-start", gap: 12, padding: "12px 12px", borderRadius: 12, border: `1px solid ${C.border}`, backgroundColor: C.card, color: C.white, cursor: "pointer", width: "100%", textAlign: "left" }}
                    >
                      <span style={{ fontSize: 22, flexShrink: 0, marginTop: 2 }}>{item.icon}</span>
                      <div>
                        <div style={{ fontWeight: 900, fontSize: 14 }}>{item.label}</div>
                        <div style={{ color: C.dim, fontSize: 12, marginTop: 3, lineHeight: 1.4 }}>{item.desc}</div>
                      </div>
                    </button>
                  ))}
                  {filteredActions.length === 0 && (
                    <div style={{ color: C.muted, padding: 20, textAlign: "center" }}>No se encontraron acciones</div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── right panel: Executions ── */}
        {sidebarTab === "executions" && !actionsOpen && (
          <div style={{ width: 380, backgroundColor: C.sidebar, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "hidden", flexShrink: 0 }}>
            <div style={{ padding: 16, borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>Executions</div>
              <div style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>{executions.length}</div>
            </div>
            <div style={{ flex: 1, overflow: "auto" }}>
              {executions.length === 0 && (
                <div style={{ padding: 18, color: C.muted, fontSize: 13, lineHeight: 1.5 }}>
                  No executions yet. Run or test the flow to see logs.
                </div>
              )}
              {executions.map(exec => {
                const active = exec?.id === selectedExecutionId;
                const ok = exec?.status === "ok";
                return (
                  <button
                    key={exec.id}
                    onClick={() => setSelectedExecutionId(exec.id)}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: "none",
                      cursor: "pointer",
                      backgroundColor: active ? `${C.lime}14` : "transparent",
                      borderBottom: `1px solid ${C.border}`,
                      padding: "12px 14px",
                      color: C.white,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ fontWeight: 900, fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {String(exec.mode || "test").toUpperCase()} · {ok ? "OK" : "ERROR"}
                      </div>
                      <div style={{ color: ok ? "#84cc16" : "#ef4444", fontWeight: 900, fontSize: 12 }}>{ok ? "✓" : "!"}</div>
                    </div>
                    <div style={{ marginTop: 6, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                      <div style={{ color: C.dim, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {exec.started_at ? new Date(exec.started_at).toLocaleString() : ""}
                      </div>
                      <div style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>{Number(exec.duration_ms || 0)}ms</div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div style={{ borderTop: `1px solid ${C.border}`, padding: 14, backgroundColor: C.dark, maxHeight: 320, overflow: "auto" }}>
              {!selectedExecution && (
                <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
                  Select an execution to see its steps.
                </div>
              )}
              {selectedExecution && (
                <div style={{ display: "grid", gap: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontWeight: 900, fontSize: 13 }}>Steps</div>
                    <div style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>{(selectedExecution.steps || []).length}</div>
                  </div>
                  {(selectedExecution.steps || []).map((s: any, idx: number) => (
                    <div key={idx} style={{ padding: 10, borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: "rgba(255,255,255,0.02)" }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
                        <div style={{ fontWeight: 900, fontSize: 12, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.label}</div>
                        <div style={{ color: s.status === "ok" ? "#84cc16" : "#ef4444", fontWeight: 900, fontSize: 11 }}>{String(s.status || "ok").toUpperCase()}</div>
                      </div>
                      <div style={{ marginTop: 6, color: C.muted, fontSize: 12, lineHeight: 1.4 }}>{s.message}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── right panel: Node configuration ── */}
        {selectedNodeId && !actionsOpen && sidebarTab !== "executions" && selectedNode && (
          <div style={{ width: 380, backgroundColor: C.sidebar, borderLeft: `1px solid ${C.border}`, display: "flex", flexDirection: "column", overflow: "auto", flexShrink: 0, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontWeight: 900, fontSize: 16 }}>{String(selectedNode.data.label)}</div>
            </div>
            <div style={{ color: C.dim, fontSize: 12, marginBottom: 14 }}>{String(selectedNode.data.sub)}</div>

            <div style={{ display: "grid", gap: 12 }}>
              <label style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>
                Nombre del nodo
                <input
                  value={String(selectedNode.data.label || "")}
                  onChange={e => {
                    const val = e.target.value;
                    setNodes(nds => nds.map(n => n.id === selectedNodeId ? { ...n, data: { ...n.data, label: val } } : n));
                  }}
                  onBlur={() => scheduleSave(nodes, edges)}
                  style={{ width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 10, backgroundColor: C.dark, border: `1px solid ${C.border}`, color: C.white, boxSizing: "border-box" }}
                />
              </label>

              <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
                <div style={{ fontWeight: 900, fontSize: 13, marginBottom: 8 }}>Configuración</div>

                {(() => {
                  const sub = String(selectedNode.data.sub || "").trim().replace(/\s+/g, "_").toUpperCase();
                  const cfg = (selectedNode.data.config && typeof selectedNode.data.config === "object") ? selectedNode.data.config : {};

                  const setCfg = (patch: any) => {
                    setNodes(nds => nds.map(n => {
                      if (n.id !== selectedNodeId) return n;
                      const prev = (n as any)?.data?.config && typeof (n as any).data.config === "object" ? (n as any).data.config : {};
                      return { ...n, data: { ...(n as any).data, config: { ...prev, ...patch } } };
                    }));
                  };

                  const setCfgRaw = (raw: string) => {
                    try {
                      const parsed = JSON.parse(raw || "{}");
                      if (parsed && typeof parsed === "object") {
                        setNodes(nds => nds.map(n => (n.id === selectedNodeId ? { ...n, data: { ...(n as any).data, config: parsed } } : n)));
                      }
                    } catch {
                      // ignore
                    }
                  };

                  const inputStyle: React.CSSProperties = { width: "100%", marginTop: 6, padding: "10px 12px", borderRadius: 10, backgroundColor: C.dark, border: `1px solid ${C.border}`, color: C.white, boxSizing: "border-box" };

                  return (
                    <div style={{ display: "grid", gap: 12 }}>
                      {sub === "GOOGLE_SHEETS" && (
                        <>
                          <label style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>
                            Document
                            <input value={String(cfg.document || "")} onChange={e => setCfg({ document: e.target.value })} onBlur={() => scheduleSave(nodes, edges)} style={inputStyle} />
                          </label>
                          <label style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>
                            Sheet
                            <input value={String(cfg.sheet || "")} onChange={e => setCfg({ sheet: e.target.value })} onBlur={() => scheduleSave(nodes, edges)} style={inputStyle} />
                          </label>
                          <label style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>
                            Status filter
                            <input value={String(cfg.status_filter || "")} onChange={e => setCfg({ status_filter: e.target.value })} onBlur={() => scheduleSave(nodes, edges)} style={inputStyle} />
                          </label>
                        </>
                      )}

                      {sub === "TIME" && (
                        <label style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>
                          Time (seconds)
                          <input value={String(cfg.time_in_seconds || "")} onChange={e => setCfg({ time_in_seconds: e.target.value })} onBlur={() => scheduleSave(nodes, edges)} style={inputStyle} />
                        </label>
                      )}

                      {(sub === "VOICE_AGENT" || sub === "DAPTA_PHONECALL") && (
                        <>
                          <label style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>
                            From number
                            <input value={String(cfg.from_number || "")} onChange={e => setCfg({ from_number: e.target.value })} onBlur={() => scheduleSave(nodes, edges)} style={inputStyle} />
                          </label>
                          <label style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>
                            To number
                            <input value={String(cfg.to_number || "")} onChange={e => setCfg({ to_number: e.target.value })} onBlur={() => scheduleSave(nodes, edges)} style={inputStyle} />
                          </label>
                          <label style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>
                            Agent ID
                            <input value={String(cfg.agent_id || "")} onChange={e => setCfg({ agent_id: e.target.value })} onBlur={() => scheduleSave(nodes, edges)} style={inputStyle} />
                          </label>
                          <div style={{ padding: 12, borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: C.dark }}>
                            <div style={{ fontWeight: 900, fontSize: 12, marginBottom: 8 }}>Variables</div>
                            {Array.isArray(cfg.variables) && cfg.variables.length > 0 ? (
                              <div style={{ display: "grid", gap: 8 }}>
                                {cfg.variables.map((v: any, i: number) => (
                                  <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                                    <input
                                      value={String(v.key || "")}
                                      onChange={e => {
                                        const next = (cfg.variables || []).slice();
                                        next[i] = { ...(next[i] || {}), key: e.target.value };
                                        setCfg({ variables: next });
                                      }}
                                      onBlur={() => scheduleSave(nodes, edges)}
                                      placeholder="key"
                                      style={inputStyle}
                                    />
                                    <input
                                      value={String(v.value || "")}
                                      onChange={e => {
                                        const next = (cfg.variables || []).slice();
                                        next[i] = { ...(next[i] || {}), value: e.target.value };
                                        setCfg({ variables: next });
                                      }}
                                      onBlur={() => scheduleSave(nodes, edges)}
                                      placeholder="value"
                                      style={inputStyle}
                                    />
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div style={{ color: C.muted, fontSize: 12 }}>No variables</div>
                            )}
                            <button
                              onClick={() => {
                                const next = Array.isArray(cfg.variables) ? cfg.variables.slice() : [];
                                next.push({ key: "", value: "" });
                                setCfg({ variables: next });
                                setTimeout(() => scheduleSave(nodes, edges), 0);
                              }}
                              style={{ marginTop: 10, width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${C.border}`, backgroundColor: "transparent", color: C.white, cursor: "pointer", fontWeight: 900 }}
                            >
                              + Add variable
                            </button>
                          </div>
                        </>
                      )}

                      {(sub === "CONDITIONAL" || /if_error/i.test(String(selectedNode.data.label || ""))) && (
                        <label style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>
                          Error rate (0..1)
                          <input value={String(cfg.error_rate ?? "0")} onChange={e => setCfg({ error_rate: e.target.value })} onBlur={() => scheduleSave(nodes, edges)} style={inputStyle} />
                        </label>
                      )}

                      <label style={{ color: C.dim, fontSize: 12, fontWeight: 900 }}>
                        Raw config (JSON)
                        <textarea
                          defaultValue={JSON.stringify(cfg || {}, null, 2)}
                          onBlur={e => {
                            setCfgRaw(e.target.value);
                            scheduleSave(nodes, edges);
                          }}
                          style={{ ...inputStyle, minHeight: 140, fontFamily: "ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace", resize: "vertical" }}
                        />
                      </label>

                      <div style={{ color: C.muted, fontSize: 12, lineHeight: 1.5 }}>
                        Tip: you can reference values like <span style={{ color: C.white, fontWeight: 900 }}>{"{"}{"{"}parse_contact.formatPhone{"}"}{"}"}</span> in phone fields.
                      </div>
                    </div>
                  );
                })()}

                <div style={{ marginTop: 12, padding: 12, backgroundColor: C.dark, borderRadius: 10, border: `1px solid ${C.border}` }}>
                  <div style={{ color: C.dim, fontSize: 11, fontWeight: 800, marginBottom: 4 }}>Node ID</div>
                  <div style={{ color: C.muted, fontSize: 12, wordBreak: "break-all" }}>{selectedNode.id}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
