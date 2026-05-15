import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";
import os from "os";

const PRIMARY_ROOT = path.join(process.cwd(), ".data", "intelligence-v1");
const FALLBACK_ROOT = path.join(os.tmpdir(), "botz-intelligence-v1");

type DbShape = {
  uploads: Record<string, any>;
  datasets: Record<string, any>;
  alertRules: Record<string, any>;
};

async function ensureRoot() {
  try {
    await fs.mkdir(PRIMARY_ROOT, { recursive: true });
  } catch {
    await fs.mkdir(FALLBACK_ROOT, { recursive: true });
  }
}

async function resolveRoot() {
  await ensureRoot();
  try {
    await fs.access(PRIMARY_ROOT);
    return PRIMARY_ROOT;
  } catch {
    return FALLBACK_ROOT;
  }
}

async function readJson<T>(file: string, fallback: T): Promise<T> {
  try {
    const raw = await fs.readFile(file, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(file: string, value: unknown) {
  await fs.writeFile(file, JSON.stringify(value, null, 2), "utf8");
}

async function dbFilePath() {
  return path.join(await resolveRoot(), "db.json");
}

export async function readDb(): Promise<DbShape> {
  return readJson<DbShape>(await dbFilePath(), { uploads: {}, datasets: {}, alertRules: {} });
}

export async function writeDb(db: DbShape) {
  await writeJson(await dbFilePath(), db);
}

export function newId() {
  return randomUUID();
}

export async function saveUploadFile(id: string, fileName: string, bytes: ArrayBuffer) {
  const dir = path.join(await resolveRoot(), "files");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${id}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  await fs.writeFile(filePath, Buffer.from(bytes));
  return filePath;
}
