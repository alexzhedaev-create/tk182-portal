import { access, mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const pagesDirectory = resolve(process.cwd(), "pages");
const distDirectory = process.env.NEXT_DIST_DIR?.trim() || ".next";
const pagesManifestPath = resolve(
  process.cwd(),
  distDirectory,
  "server",
  "pages-manifest.json"
);
const pagesOutputDirectory = resolve(process.cwd(), distDirectory, "server", "pages");
const legacyTracePlaceholder = `${JSON.stringify({ version: 1, files: [] })}\n`;

async function removeEmptyPagesDirectory() {
  try {
    const directoryEntries = await readdir(pagesDirectory);

    if (directoryEntries.length === 0) {
      await rm(pagesDirectory, { recursive: true, force: true });
      console.warn(
        "[tk182:web] Removed an empty pages/ directory to keep the App Router production build stable."
      );
    }
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

async function ensureLegacyPagesManifestPlaceholder() {
  await mkdir(dirname(pagesManifestPath), { recursive: true });
  await mkdir(pagesOutputDirectory, { recursive: true });

  try {
    await access(pagesManifestPath);
  } catch {
    await writeFile(pagesManifestPath, "{}\n", "utf8");
  }
}

async function ensureLegacyPageTracePlaceholders() {
  let directoryEntries;

  try {
    directoryEntries = await readdir(pagesDirectory);
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const entry of directoryEntries) {
    if (!/\.(?:js|jsx|ts|tsx)$/u.test(entry)) {
      continue;
    }

    const traceFileName = entry.replace(/\.(?:js|jsx|ts|tsx)$/u, ".js.nft.json");
    const traceFilePath = resolve(pagesOutputDirectory, traceFileName);

    try {
      await access(traceFilePath);
    } catch {
      await writeFile(traceFilePath, legacyTracePlaceholder, "utf8");
    }
  }
}

await removeEmptyPagesDirectory();
await ensureLegacyPagesManifestPlaceholder();
await ensureLegacyPageTracePlaceholders();
