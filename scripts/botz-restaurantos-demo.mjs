import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const source = path.join(root, "public", "Demo restaurantos.mp4");
const work = path.join(root, "artifacts", "restaurantos-demo");

const tracks = [
  {
    language: "es",
    voice: "es-CO-GonzaloNeural",
    output: path.join(root, "public", "botz-restaurantos-demo.mp4"),
    segments: [
      [0.6, "RestaurantOS centraliza toda la operación de tu restaurante en una sola vista."],
      [6.5, "Los pedidos llegan con cliente, canal, estado y total, listos para gestionar."],
      [12.5, "En cocina, cada orden avanza de preparación a lista y completada, sin perder trazabilidad."],
      [20.5, "Cada cambio se actualiza al instante para coordinar al equipo de servicio."],
      [28.5, "Las reservas organizan horarios, comensales, mesas y estados de atención."],
      [36.5, "El menú permite editar productos, categorías, precios y disponibilidad desde un solo lugar."],
      [44.5, "Pagos reúne transacciones pendientes y completadas, con métodos y comprobantes claros."],
      [52.5, "Registrar un pago toma segundos y mantiene la operación conciliada."],
      [60.5, "Gestiona empleados, roles, sedes, contactos y disponibilidad del equipo."],
      [69.5, "Consulta quién está activo y controla la asistencia desde el mismo panel."],
      [76.5, "Los reportes convierten ventas, productos y canales en decisiones accionables."],
      [85.5, "El Copilot responde preguntas operativas y detecta pendientes en tiempo real."],
      [94.5, "Configura la identidad, ubicación, moneda, idioma y zona horaria del negocio."],
      [108, "También puedes definir horarios y habilitar pedidos de delivery o recogida."],
      [123, "Los cambios quedan guardados y disponibles para toda la operación."],
      [134.5, "Finalmente, delivery muestra pedidos, conductores, tiempos y estado de cada entrega."],
    ],
  },
  {
    language: "en",
    voice: "en-US-AndrewMultilingualNeural",
    output: path.join(root, "public", "botz-restaurantos-demo-en.mp4"),
    segments: [
      [0.6, "RestaurantOS brings your entire restaurant operation into one clear dashboard."],
      [6.5, "Orders arrive with customer, channel, status and total, ready to manage."],
      [12.5, "In the kitchen, every order moves from preparation to ready and completed with full traceability."],
      [20.5, "Every change updates instantly to keep the service team coordinated."],
      [28.5, "Reservations organize schedules, guests, tables and service status."],
      [36.5, "The menu lets you edit products, categories, prices and availability in one place."],
      [44.5, "Payments brings pending and completed transactions together with clear methods and receipts."],
      [52.5, "Recording a payment takes seconds and keeps operations reconciled."],
      [60.5, "Manage employees, roles, locations, contacts and team availability."],
      [69.5, "See who is active and control attendance from the same panel."],
      [76.5, "Reports turn sales, products and channels into actionable decisions."],
      [85.5, "The Copilot answers operational questions and identifies pending work in real time."],
      [94.5, "Configure your business identity, location, currency, language and time zone."],
      [108, "You can also define operating hours and enable delivery or pickup orders."],
      [123, "Changes are saved and made available across the entire operation."],
      [134.5, "Finally, delivery shows orders, drivers, timing and the status of every delivery."],
    ],
  },
];

if (!fs.existsSync(source)) throw new Error(`Missing source video: ${source}`);
fs.mkdirSync(work, { recursive: true });

const videoDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", source], { encoding: "utf8" }).trim());

for (const track of tracks) {
  const inputs = [source];
  const filters = [];

  track.segments.forEach(([start, text], index) => {
    const prefix = `${track.language}-${String(index + 1).padStart(2, "0")}`;
    const textFile = path.join(work, `${prefix}.txt`);
    const rawAudio = path.join(work, `${prefix}-raw.mp3`);
    const fittedAudio = path.join(work, `${prefix}.m4a`);
    fs.writeFileSync(textFile, text, "utf8");

    execFileSync("python", ["-m", "edge_tts", "--voice", track.voice, "--rate=-4%", "--pitch=-2Hz", "--file", textFile, "--write-media", rawAudio], { stdio: "inherit" });

    const rawDuration = Number(execFileSync("ffprobe", ["-v", "error", "-show_entries", "format=duration", "-of", "default=nw=1:nk=1", rawAudio], { encoding: "utf8" }).trim());
    const nextStart = track.segments[index + 1]?.[0] ?? videoDuration;
    const available = Math.max(1, nextStart - start - 0.3);
    const tempo = Math.max(1, rawDuration / available);

    execFileSync("ffmpeg", ["-y", "-hide_banner", "-loglevel", "error", "-i", rawAudio, "-af", `atempo=${tempo.toFixed(4)},apad=pad_dur=0.08`, "-c:a", "aac", "-b:a", "160k", fittedAudio], { stdio: "inherit" });
    inputs.push(fittedAudio);
    filters.push(`[${index + 1}:a]adelay=${Math.round(start * 1000)}:all=1,volume=1.08[a${index}]`);
  });

  const labels = track.segments.map((_, index) => `[a${index}]`).join("");
  const args = ["-y", "-hide_banner", "-loglevel", "error"];
  for (const input of inputs) args.push("-i", input);
  args.push(
    "-filter_complex",
    `${filters.join(";")};${labels}amix=inputs=${track.segments.length}:duration=longest:normalize=0,alimiter=limit=0.95[aout]`,
    "-map", "0:v:0",
    "-map", "[aout]",
    "-c:v", "copy",
    "-c:a", "aac",
    "-b:a", "160k",
    "-t", videoDuration.toFixed(3),
    "-movflags", "+faststart",
    track.output,
  );
  execFileSync("ffmpeg", args, { stdio: "inherit" });
  console.log(`Created ${path.relative(root, track.output)} with ${track.language.toUpperCase()} narration.`);
}

console.log(`Temporary narration assets: ${path.relative(root, work)} (${os.platform()})`);
