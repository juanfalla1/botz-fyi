const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" rx="112" fill="#fff"/><path d="M93 240c18-118 91-172 163-172s145 54 163 172c-43-66-97-101-163-101S136 174 93 240Z" fill="#f21d42"/><circle cx="256" cy="176" r="31" fill="#f21d42"/><path d="M256 222c-35-53-72-67-109-42 42 17 64 63 77 116l32 56 32-56c13-53 35-99 77-116-37-25-74-11-109 42Z" fill="#f21d42"/><circle cx="154" cy="244" r="27" fill="#0753a6"/><circle cx="358" cy="244" r="27" fill="#0753a6"/><path d="M74 270c62-14 112 7 150 66-71 7-119-14-150-66Zm364 0c-62-14-112 7-150 66 71 7 119-14 150-66Z" fill="#0753a6"/><path d="M137 287c25 11 47 31 65 61l-31 47c-38-25-63-61-73-109 13-3 26-3 39 1Zm238 0c-25 11-47 31-65 61l31 47c38-25 63-61 73-109-13-3-26-3-39 1Z" fill="#0753a6"/></svg>`;

export function GET() {
  return new Response(icon, { headers: { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400" } });
}
