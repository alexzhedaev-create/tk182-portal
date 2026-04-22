import { spawn } from "node:child_process";
import { access, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";

const distDirectory = process.env.NEXT_DIST_DIR?.trim() || ".next";
const buildIdPath = resolve(process.cwd(), distDirectory, "BUILD_ID");
const serverOutputDirectory = resolve(process.cwd(), distDirectory, "server");
const pagesOutputDirectory = resolve(serverOutputDirectory, "pages");
const appOutputDirectory = resolve(serverOutputDirectory, "app");
const pagesManifestPath = resolve(
  process.cwd(),
  distDirectory,
  "server",
  "pages-manifest.json"
);
const appPathsManifestPath = resolve(
  process.cwd(),
  distDirectory,
  "server",
  "app-paths-manifest.json"
);
const legacyTracePlaceholder = `${JSON.stringify({ version: 1, files: [] })}\n`;
const legacyPagesManifest = {
  "/404": "pages/404.js",
  "/_app": "pages/_app.js",
  "/_document": "pages/_document.js",
  "/_error": "pages/_error.js",
  "/runtime-probe": "pages/runtime-probe.js"
};
let ensuredStaticDirectory = false;

async function ensureTracePlaceholdersForDirectory(directoryPath) {
  let entries;

  try {
    entries = await readdir(directoryPath, { withFileTypes: true });
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }

  for (const entry of entries) {
    const entryPath = resolve(directoryPath, entry.name);

    if (entry.isDirectory()) {
      await ensureTracePlaceholdersForDirectory(entryPath);
      continue;
    }

    if (!entry.isFile() || !entry.name.endsWith(".js")) {
      continue;
    }

    const traceFilePath = resolve(directoryPath, `${entry.name}.nft.json`);

    try {
      await access(traceFilePath);
    } catch {
      await writeFile(traceFilePath, legacyTracePlaceholder, "utf8");
    }
  }
}

async function ensureLegacyRuntimePlaceholders() {
  await mkdir(pagesOutputDirectory, { recursive: true });

  try {
    await access(pagesManifestPath);
  } catch {
    await writeFile(
      pagesManifestPath,
      `${JSON.stringify(legacyPagesManifest, null, 2)}\n`,
      "utf8"
    );
  }

  try {
    await access(appPathsManifestPath);
  } catch {
    await writeFile(appPathsManifestPath, "{}\n", "utf8");
  }

  await ensureTracePlaceholdersForDirectory(pagesOutputDirectory);
  await ensureTracePlaceholdersForDirectory(appOutputDirectory);
}

async function ensureStaticDirectoryForBuildId() {
  if (ensuredStaticDirectory) {
    return;
  }

  try {
    await access(buildIdPath);
    const buildId = (await readFile(buildIdPath, "utf8")).trim();

    if (!buildId) {
      return;
    }

    await mkdir(resolve(process.cwd(), distDirectory, "static", buildId), {
      recursive: true
    });
    ensuredStaticDirectory = true;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return;
    }

    throw error;
  }
}

const buildProcess = spawn("next", ["build"], {
  cwd: process.cwd(),
  env: process.env,
  stdio: "inherit",
  shell: process.platform === "win32"
});

const watcher = (async () => {
  while (buildProcess.exitCode === null) {
    await ensureLegacyRuntimePlaceholders();
    await ensureStaticDirectoryForBuildId();
    await delay(25);
  }
})();

const exitCode = await new Promise((resolve, reject) => {
  buildProcess.on("error", reject);
  buildProcess.on("exit", (code) => {
    resolve(code ?? 1);
  });
});

await watcher;
await ensureLegacyRuntimePlaceholders();
await ensureStaticDirectoryForBuildId();
process.exit(exitCode);
