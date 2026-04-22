import { rm } from "node:fs/promises";
import { resolve } from "node:path";

const distDirectory = process.env.NEXT_DIST_DIR?.trim() || ".next";
const distPath = resolve(process.cwd(), distDirectory);

await rm(distPath, { recursive: true, force: true });
