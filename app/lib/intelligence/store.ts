import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

const ROOT = path.join(process.cwd(), ".data", "intelligence-v1");

type DbShape = {
  uploads: Record<string, any>;
  datasets: Record<string, any>;
  alertRules: Record<string, any>;
};

async function ensureRoot() {
  await fs.mkdir(ROOT, { recursive: true });
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

const DB_FILE = path.join(ROOT, "db.json");

export async function readDb(): Promise<DbShape> {
  await ensureRoot();
  return readJson<DbShape>(DB_FILE, { uploads: {}, datasets: {}, alertRules: {} });
}

export async function writeDb(db: DbShape) {
  await ensureRoot();
  await writeJson(DB_FILE, db);
}

export function newId() {
  return randomUUID();
}

export async function saveUploadFile(id: string, fileName: string, bytes: ArrayBuffer) {
  await ensureRoot();
  const dir = path.join(ROOT, "files");
  await fs.mkdir(dir, { recursive: true });
  const filePath = path.join(dir, `${id}-${fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`);
  await fs.writeFile(filePath, Buffer.from(bytes));
  return filePath;
}
