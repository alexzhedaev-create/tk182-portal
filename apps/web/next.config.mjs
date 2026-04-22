import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));
const workspaceRoot = resolve(currentDirectory, "../..");

function loadWorkspaceEnvFile(envPath) {
  const fileContents = readFileSync(envPath, "utf8");

  for (const rawLine of fileContents.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separatorIndex = line.indexOf("=");

    if (separatorIndex === -1) {
      continue;
    }

    const key = line.slice(0, separatorIndex).trim();
    const value = line.slice(separatorIndex + 1).trim().replace(/^["']|["']$/gu, "");

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }
}

const workspaceEnvPath = resolve(workspaceRoot, ".env");
const distDirectory = process.env.NEXT_DIST_DIR?.trim() || ".next";

if (existsSync(workspaceEnvPath)) {
  loadWorkspaceEnvFile(workspaceEnvPath);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: distDirectory,
  transpilePackages: ["@tk182/shared-types"]
};

export default nextConfig;
