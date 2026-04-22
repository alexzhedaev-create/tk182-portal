import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import "./prepare-runtime.mjs";

const productionDistDirectory = process.env.NEXT_DIST_DIR?.trim() || ".next";
const host = process.env.WEB_HOST ?? "127.0.0.1";
const port = process.env.WEB_PORT ?? "3000";

function hasCompleteProductionBuild() {
  return (
    existsSync(resolve(process.cwd(), productionDistDirectory, "BUILD_ID")) &&
    existsSync(resolve(process.cwd(), productionDistDirectory, "server")) &&
    existsSync(resolve(process.cwd(), productionDistDirectory, "static"))
  );
}

const useProductionRuntime = hasCompleteProductionBuild();
const nextMode = useProductionRuntime ? "start" : "dev";
const runtimeDistDirectory = useProductionRuntime ? productionDistDirectory : ".next-dev";

if (!useProductionRuntime) {
  console.warn(
    `[tk182:web] Production build artifacts in ${productionDistDirectory} are incomplete. Falling back to next dev for this local runtime.`
  );
}

const child = spawn(
  "pnpm",
  ["exec", "next", nextMode, "--hostname", host, "--port", port],
  {
    cwd: process.cwd(),
    env: {
      ...process.env,
      NEXT_DIST_DIR: runtimeDistDirectory
    },
    stdio: "inherit"
  }
);

child.on("error", (error) => {
  console.error(error);
  process.exit(1);
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }

  process.exit(code ?? 1);
});
