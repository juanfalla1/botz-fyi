function normalizeText(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function pickYoutubeVideoForModel(modelName: string): string {
  const n = normalizeText(String(modelName || "")).replace(/[^a-z0-9]/g, "");
  if (!n) return "";

  if (/^(px3202e|px1602e|px4202e|px6202e|px323e|px623e|px224e)$/.test(n)) return "https://www.youtube.com/watch?v=7ZsVR_jgeLE";
  if (/^(sjx|spx|stx)\w*/.test(n)) return "https://www.youtube.com/watch?v=7ZsVR_jgeLE";
  if (/^(ax2202e|ax6202e|ax223e|ax423e|ax623e|ax224e)$/.test(n)) return "https://www.youtube.com/watch?v=70aadRdYOAI";
  if (/^(exr2202|exr4202|exr6202|exr12202|exp2202|exp4202|exp6202|exp12202|exp223ad|exp423ad|exp623ad|exp1203ad|exp224ad|exp324ad)$/.test(n)) return "https://www.youtube.com/watch?v=g6vM5wGsOi4";
  if (/^(exr|exp)\d+/.test(n)) return "https://www.youtube.com/watch?v=g6vM5wGsOi4";

  if (/^(px85|px225d)$/.test(n)) return "https://www.youtube.com/watch?v=ntnDSczGmD4";
  if (/^(ax85|ax125d|ax225d|exr125d|exr225d|exp125dad|exp225dad)$/.test(n)) return "https://www.youtube.com/watch?v=uZJxn0o4PDk";

  if (/^r31p/.test(n)) return "https://www.youtube.com/watch?v=poLl3iDjTaE";
  if (/^rc31p/.test(n)) return "https://www.youtube.com/watch?v=Af2j9V6QR9w";
  if (/^r71(md|mhd)/.test(n)) return "https://www.youtube.com/watch?v=r2YqUbDcCcE";

  return "";
}
