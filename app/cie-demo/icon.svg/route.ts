const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#123c69"/><path d="M103 146h306v220H103z" fill="#fff" opacity=".96"/><path d="M78 154 256 62l178 92-178 92L78 154Z" fill="#e6b85c"/><path d="M155 217h62v101h-62zm140 0h62v101h-62z" fill="#2e7d75"/><path d="M110 350h292v42H110z" fill="#e6b85c"/><circle cx="256" cy="154" r="38" fill="#123c69"/><path d="m237 154 14 14 28-31" fill="none" stroke="#fff" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

export function GET() {
  return new Response(icon, {
    headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" },
  });
}
