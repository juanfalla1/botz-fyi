type ReqContext = {
  route: string;
  requestId: string;
  startedAt: number;
  ip: string;
};

function readIp(req: Request) {
  const xf = req.headers.get("x-forwarded-for") || "";
  const first = xf.split(",")[0]?.trim();
  return first || req.headers.get("x-real-ip") || "unknown";
}

export function makeReqContext(req: Request, route: string): ReqContext {
  return {
    route,
    requestId: req.headers.get("x-request-id") || crypto.randomUUID(),
    startedAt: Date.now(),
    ip: readIp(req),
  };
}

export function elapsedMs(ctx: ReqContext) {
  return Date.now() - ctx.startedAt;
}

export function logReq(ctx: ReqContext, level: "info" | "warn" | "error", event: string, extra: Record<string, unknown> = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    route: ctx.route,
    request_id: ctx.requestId,
    ip: ctx.ip,
    elapsed_ms: elapsedMs(ctx),
    event,
    ...extra,
  };
  const line = JSON.stringify(payload);
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}
