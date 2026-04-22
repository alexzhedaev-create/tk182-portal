import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { fileURLToPath } from "node:url";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

export const workspaceRoot = path.resolve(currentDirectory, "../..");
export const apiPort = 3101;
export const webPort = 3100;
export const apiBaseUrl = `http://127.0.0.1:${apiPort}`;
export const webBaseUrl = `http://127.0.0.1:${webPort}`;

function createDefaultEnv() {
  return {
    ...process.env,
    API_HOST: "127.0.0.1",
    API_PORT: String(apiPort),
    WEB_HOST: "127.0.0.1",
    WEB_PORT: String(webPort),
    WEB_PUBLIC_URL: webBaseUrl,
    NEXT_PUBLIC_API_URL: apiBaseUrl,
    API_INTERNAL_URL: apiBaseUrl
  };
}

export async function runCommand(command, args, options = {}) {
  const env = {
    ...createDefaultEnv(),
    ...(options.env ?? {})
  };

  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? workspaceRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          [
            `Command failed: ${command} ${args.join(" ")}`,
            stdout.trim(),
            stderr.trim()
          ]
            .filter(Boolean)
            .join("\n\n")
        )
      );
    });
  });
}

export async function waitForHttp(url, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30000;
  const startedAt = Date.now();
  let lastError = null;
  const validate = options.validate ?? ((candidate) => candidate.ok);

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url, {
        redirect: "manual"
      });

      if (await validate(response)) {
        return response;
      }

      lastError = new Error(`Unexpected HTTP status ${response.status} for ${url}`);
    } catch (error) {
      lastError = error;
    }

    await delay(250);
  }

  throw new Error(
    `Timed out while waiting for ${url}${lastError ? `: ${String(lastError)}` : ""}`
  );
}

export async function startManagedProcess(name, command, args, options = {}) {
  const env = {
    ...createDefaultEnv(),
    ...(options.env ?? {})
  };
  const child = spawn(command, args, {
    cwd: options.cwd ?? workspaceRoot,
    env,
    stdio: ["ignore", "pipe", "pipe"],
    detached: process.platform !== "win32"
  });
  const logs = [];

  function appendLog(prefix, chunk) {
    logs.push(`${prefix}${chunk.toString()}`.trimEnd());

    if (logs.length > 200) {
      logs.shift();
    }
  }

  child.stdout.on("data", (chunk) => {
    appendLog("", chunk);
  });

  child.stderr.on("data", (chunk) => {
    appendLog("ERR: ", chunk);
  });

  const exitPromise = new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("exit", (code, signal) => {
      resolve({ code, signal });
    });
  });

  if (options.readyUrl) {
    const readyPromise = waitForHttp(options.readyUrl, {
      timeoutMs: options.timeoutMs,
      validate: options.validate
    });
    const result = await Promise.race([
      readyPromise.then(() => "ready"),
      exitPromise.then((status) => {
        throw new Error(
          `${name} exited before becoming ready: ${JSON.stringify(status)}\n${logs.join(
            "\n"
          )}`
        );
      })
    ]);

    assert.equal(result, "ready");
  }

  return {
    name,
    process: child,
    logs,
    async stop() {
      if (child.exitCode !== null) {
        return;
      }

      const processTarget =
        process.platform !== "win32" && child.pid ? -child.pid : child.pid;

      if (processTarget) {
        try {
          process.kill(processTarget, "SIGTERM");
        } catch (error) {
          if (!(error && typeof error === "object" && "code" in error && error.code === "ESRCH")) {
            throw error;
          }
        }
      }

      const result = await Promise.race([
        exitPromise,
        delay(5000).then(() => "timeout")
      ]);

      if (result === "timeout") {
        if (processTarget) {
          try {
            process.kill(processTarget, "SIGKILL");
          } catch (error) {
            if (
              !(error && typeof error === "object" && "code" in error && error.code === "ESRCH")
            ) {
              throw error;
            }
          }
        }

        await exitPromise;
      }
    }
  };
}

export function assertCreatedOrOk(status, context) {
  assert.ok(
    status === 200 || status === 201,
    context ? `${context} (status ${status})` : `Unexpected status ${status}`
  );
}

function readSetCookieHeaders(response) {
  if (typeof response.headers.getSetCookie === "function") {
    return response.headers.getSetCookie();
  }

  const setCookie = response.headers.get("set-cookie");
  return setCookie ? [setCookie] : [];
}

export class SessionClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  async request(pathname, options = {}) {
    const headers = new Headers(options.headers ?? {});
    const cookieHeader = this.getCookieHeader();

    if (cookieHeader) {
      headers.set("cookie", cookieHeader);
    }

    const response = await fetch(`${this.baseUrl}${pathname}`, {
      ...options,
      headers,
      redirect: "manual"
    });
    this.captureCookies(response);

    return response;
  }

  async requestJson(pathname, options = {}) {
    const response = await this.request(pathname, options);
    const text = await response.text();

    return {
      response,
      text,
      data: text.trim() ? JSON.parse(text) : null
    };
  }

  captureCookies(response) {
    for (const header of readSetCookieHeaders(response)) {
      const firstPart = header.split(";", 1)[0];
      const separatorIndex = firstPart.indexOf("=");

      if (separatorIndex === -1) {
        continue;
      }

      const name = firstPart.slice(0, separatorIndex).trim();
      const value = firstPart.slice(separatorIndex + 1).trim();

      if (!value) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  getCookieHeader() {
    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }
}

export async function loginAs(client, credentials) {
  const result = await client.requestJson("/auth/login", {
    method: "POST",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify(credentials)
  });

  assertCreatedOrOk(result.response.status, result.text);

  return result.data;
}

export function createTextUpload(name, content) {
  const formData = new FormData();
  formData.set("file", new File([content], name, { type: "text/plain" }));

  return formData;
}

export async function resetDatabase() {
  await runCommand("pnpm", ["db:setup"]);
}
