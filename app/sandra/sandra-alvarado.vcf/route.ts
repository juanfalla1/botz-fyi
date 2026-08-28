const vcard = [
  "BEGIN:VCARD",
  "VERSION:3.0",
  "FN:Sandra Alvarado",
  "N:Alvarado;Sandra;;;",
  "ORG:Botz Technologies Inc.",
  "TITLE:Business Transformation & AI",
  "TEL;TYPE=CELL:+14374352554",
  "EMAIL:sandra@botz.fyi",
  "URL:https://www.botz.fyi",
  "END:VCARD",
  "",
].join("\r\n");

export function GET() {
  return new Response(vcard, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="Sandra-Alvarado.vcf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
