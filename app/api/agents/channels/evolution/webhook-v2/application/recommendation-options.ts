import type { GuidedBalanzaProfile } from "./guided-profiles";

export function buildGuidedPendingOptions(args: {
  rows: any[];
  profile: GuidedBalanzaProfile;
  industrialMode?: "conteo" | "estandar" | "";
  guidedGroupsByMode: (profile: GuidedBalanzaProfile, industrialMode?: "conteo" | "estandar" | "") => Array<{ models: any[] }>;
  normalizeText: (value: string) => string;
  gamaLabelForModelName: (name: string) => string;
}): any[] {
  const rowList = Array.isArray(args.rows) ? args.rows : [];
  const orderedModels = args.guidedGroupsByMode(args.profile, args.industrialMode || "").flatMap((g) => g.models);
  return orderedModels.map((m: any, i: number) => {
    const modelNorm = args.normalizeText(m.model);
    const hit = rowList.find((r: any) => {
      const n = args.normalizeText(String(r?.name || ""));
      return n === modelNorm || n.includes(modelNorm);
    });
    const gama = args.gamaLabelForModelName(m.model);
    const gamaPart = gama ? ` | Gama: ${gama}` : "";
    return {
      code: String(i + 1),
      rank: i + 1,
      id: String(hit?.id || ""),
      name: `${m.model}${gamaPart} | Cap: ${m.capacity} | Res: ${m.resolution} | Entrega: ${m.delivery}`,
      raw_name: String(hit?.name || m.model),
      category: String(hit?.category || "balanzas"),
      base_price_usd: Number(hit?.base_price_usd || 0),
    };
  });
}

export function getApplicationRecommendedOptions(args: {
  rows: any[];
  application: string;
  capTargetG: number;
  targetReadabilityG?: number;
  strictPrecision?: boolean;
  excludeId?: string;
  maxReadabilityForApplication: (application: string) => number;
  normalizeText: (value: string) => string;
  extractRowTechnicalSpec: (row: any) => { capacityG?: number; readabilityG?: number };
  familyLabelFromRow: (row: any) => string;
  buildNumberedProductOptions: (rows: any[], maxItems: number) => any[];
}): any[] {
  const rows = Array.isArray(args.rows) ? args.rows : [];
  const app = String(args.application || "").trim();
  const appMaxRead = args.maxReadabilityForApplication(app);
  const targetRead = Number(args.targetReadabilityG || 0);
  const strictPrecision = Boolean(args.strictPrecision);
  const maxRead = targetRead > 0 && strictPrecision ? Math.min(appMaxRead, targetRead) : appMaxRead;
  const capTarget = Number(args.capTargetG || 0);
  const excludeId = String(args.excludeId || "").trim();
  const isJewelry = args.normalizeText(app) === "joyeria_oro";
  const prefersLab = args.normalizeText(app) === "laboratorio";
  const highPrecisionNeed = targetRead > 0 && targetRead <= 0.001;
  const minCap = capTarget > 0 ? (isJewelry ? capTarget * 0.5 : capTarget * 0.25) : 0;
  const capMultiplier = isJewelry ? 2.5 : (prefersLab && highPrecisionNeed) ? 20 : (prefersLab ? 10 : 4);
  const maxCap = capTarget > 0 ? (capTarget * capMultiplier) : Number.POSITIVE_INFINITY;
  const filtered = rows
    .filter((r: any) => {
      const id = String(r?.id || "").trim();
      if (excludeId && id && id === excludeId) return false;
      const rs = args.extractRowTechnicalSpec(r);
      const cap = Number(rs?.capacityG || 0);
      const read = Number(rs?.readabilityG || 0);
      const appText = args.normalizeText([String(r?.name || ""), String(r?.category || ""), args.familyLabelFromRow(r)].join(" "));
      if (!(read > 0) || !(cap > 0)) return false;
      if (read > maxRead) return false;
      if (targetRead > 0 && strictPrecision && read > targetRead) return false;
      if (capTarget > 0 && (cap < minCap || cap > maxCap)) return false;
      if (isJewelry && cap > 6000) return false;
      if (args.normalizeText(app) === "laboratorio" && /(industrial|plataforma|ranger|defender|valor|rc31|r71|ckw|td52p)/.test(appText)) return false;
      if (isJewelry && /(industrial|plataforma|ranger|defender|valor|rc31|r71|ckw|td52p)/.test(appText)) return false;
      return true;
    })
    .sort((a: any, b: any) => {
      const ar = Number(args.extractRowTechnicalSpec(a)?.readabilityG || 999);
      const br = Number(args.extractRowTechnicalSpec(b)?.readabilityG || 999);
      const ac = Number(args.extractRowTechnicalSpec(a)?.capacityG || 0);
      const bc = Number(args.extractRowTechnicalSpec(b)?.capacityG || 0);
      const ad = capTarget > 0 ? Math.abs(ac - capTarget) : 0;
      const bd = capTarget > 0 ? Math.abs(bc - capTarget) : 0;
      const readDeltaA = targetRead > 0 ? Math.abs(Math.log10(Math.max(ar, 1e-9) / Math.max(targetRead, 1e-9))) : ar;
      const readDeltaB = targetRead > 0 ? Math.abs(Math.log10(Math.max(br, 1e-9) / Math.max(targetRead, 1e-9))) : br;
      const belowPenaltyA = capTarget > 0 && ac < capTarget ? 1 : 0;
      const belowPenaltyB = capTarget > 0 && bc < capTarget ? 1 : 0;
      return readDeltaA - readDeltaB || belowPenaltyA - belowPenaltyB || ad - bd || ar - br;
    });
  return args.buildNumberedProductOptions(filtered.slice(0, 8) as any[], 8);
}
