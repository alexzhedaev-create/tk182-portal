import { spawn } from "node:child_process";

const apiPort = Number.parseInt(process.env.PLAYWRIGHT_API_PORT ?? "3201", 10);
const webPort = Number.parseInt(process.env.PLAYWRIGHT_WEB_PORT ?? "3200", 10);

const sharedEnvironment = {
  ...process.env,
  API_HOST: "127.0.0.1",
  API_PORT: String(apiPort),
  WEB_HOST: "127.0.0.1",
  WEB_PORT: String(webPort),
  WEB_PUBLIC_URL: `http://127.0.0.1:${webPort}`,
  NEXT_PUBLIC_API_URL: `http://127.0.0.1:${apiPort}`,
  API_INTERNAL_URL: `http://127.0.0.1:${apiPort}`
};

function runStep(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: sharedEnvironment,
      stdio: "inherit"
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve();
        return;
      }

      reject(new Error(`Command failed: ${command} ${args.join(" ")}`));
    });
  });
}

await runStep("pnpm", ["db:setup"]);
await runStep("pnpm", ["build"]);
await runStep("pnpm", ["exec", "playwright", "test"]);
