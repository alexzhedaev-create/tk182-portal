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
const legacyPagesManifest = {
  "/404": "pages/404.js",
  "/_app": "pages/_app.js",
  "/_document": "pages/_document.js",
  "/_error": "pages/_error.js",
  "/runtime-probe": "pages/runtime-probe.js"
};
const legacyPagesAssets = {
  "pages/_app.js": `"use strict";
const React = require("react");
function LegacyApp(props) {
  return React.createElement(props.Component, props.pageProps);
}
module.exports = LegacyApp;
module.exports.default = LegacyApp;
`,
  "pages/_document.js": `"use strict";
const React = require("react");
const Document = require("next/document");
function LegacyDocument() {
  return React.createElement(
    Document.Html,
    { lang: "ru" },
    React.createElement(Document.Head, null),
    React.createElement(
      "body",
      null,
      React.createElement(Document.Main, null),
      React.createElement(Document.NextScript, null)
    )
  );
}
module.exports = LegacyDocument;
module.exports.default = LegacyDocument;
`,
  "pages/_error.js": `"use strict";
const React = require("react");
function LegacyErrorPage(props) {
  const code = props.statusCode || 500;
  const title = code === 404 ? "Страница не найдена" : "Временная ошибка";
  const description =
    code === 404
      ? "Запрошенная страница не найдена в портале ТК 182."
      : "Во время открытия страницы произошла ошибка. Попробуйте обновить страницу.";
  return React.createElement(
    "main",
    {
      style: {
        fontFamily: "\\"Avenir Next\\", \\"Segoe UI\\", \\"Helvetica Neue\\", Arial, sans-serif",
        margin: "0 auto",
        maxWidth: "48rem",
        minHeight: "100vh",
        padding: "4rem 1.5rem",
        display: "grid",
        alignContent: "center",
        gap: "1rem",
        color: "#172033",
        background: "#f5f4ef"
      }
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize: "0.875rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#8a5a44"
        }
      },
      "Портал ТК 182"
    ),
    React.createElement("h1", { style: { fontSize: "2.5rem", margin: 0 } }, code + ": " + title),
    React.createElement("p", { style: { fontSize: "1.125rem", lineHeight: 1.6, margin: 0 } }, description),
    React.createElement("p", { style: { margin: 0 } }, React.createElement("a", { href: "/" }, "Перейти на главную страницу."))
  );
}
module.exports = LegacyErrorPage;
module.exports.default = LegacyErrorPage;
`,
  "pages/404.js": `"use strict";
const React = require("react");
function NotFoundPage() {
  return React.createElement(
    "main",
    {
      style: {
        fontFamily: "\\"Avenir Next\\", \\"Segoe UI\\", \\"Helvetica Neue\\", Arial, sans-serif",
        margin: "0 auto",
        maxWidth: "48rem",
        minHeight: "100vh",
        padding: "4rem 1.5rem",
        display: "grid",
        alignContent: "center",
        gap: "1rem",
        color: "#172033",
        background: "#f5f4ef"
      }
    },
    React.createElement(
      "div",
      {
        style: {
          fontSize: "0.875rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "#8a5a44"
        }
      },
      "Портал ТК 182"
    ),
    React.createElement("h1", { style: { fontSize: "2.5rem", margin: 0 } }, "404: Страница не найдена"),
    React.createElement(
      "p",
      { style: { fontSize: "1.125rem", lineHeight: 1.6, margin: 0 } },
      "Запрошенная страница не найдена в портале ТК 182."
    ),
    React.createElement("p", { style: { margin: 0 } }, React.createElement("a", { href: "/" }, "Перейти на главную страницу."))
  );
}
module.exports = NotFoundPage;
module.exports.default = NotFoundPage;
`,
  "pages/runtime-probe.js": `"use strict";
const React = require("react");
function RuntimeProbePage() {
  return React.createElement(
    "main",
    {
      style: {
        fontFamily: "\\"Avenir Next\\", \\"Segoe UI\\", \\"Helvetica Neue\\", Arial, sans-serif",
        margin: "0 auto",
        maxWidth: "48rem",
        minHeight: "100vh",
        padding: "4rem 1.5rem",
        display: "grid",
        alignContent: "center",
        gap: "1rem",
        color: "#172033",
        background: "#f5f4ef"
      }
    },
    React.createElement("h1", { style: { fontSize: "2rem", margin: 0 } }, "Служебная страница runtime"),
    React.createElement(
      "p",
      { style: { fontSize: "1.125rem", lineHeight: 1.6, margin: 0 } },
      "Служебный маршрут Pages Router используется только для стабильной production-сборки локального MVP."
    )
  );
}
module.exports = RuntimeProbePage;
module.exports.default = RuntimeProbePage;
`
};

if (existsSync(workspaceEnvPath)) {
  loadWorkspaceEnvFile(workspaceEnvPath);
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  distDir: distDirectory,
  outputFileTracing: false,
  transpilePackages: ["@tk182/shared-types"],
  webpack: (config, { isServer, webpack }) => {
    if (isServer) {
      config.plugins.push({
        apply(compiler) {
          compiler.hooks.thisCompilation.tap(
            "Tk182LegacyPagesManifestPlugin",
            (compilation) => {
              compilation.hooks.processAssets.tap(
                {
                  name: "Tk182LegacyPagesManifestPlugin",
                  stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
                },
                () => {
                  for (const [assetName, source] of Object.entries(legacyPagesAssets)) {
                    if (!compilation.getAsset(assetName)) {
                      compilation.emitAsset(
                        assetName,
                        new webpack.sources.RawSource(source)
                      );
                    }
                  }

                  if (!compilation.getAsset("pages-manifest.json")) {
                    compilation.emitAsset(
                      "pages-manifest.json",
                      new webpack.sources.RawSource(
                        `${JSON.stringify(legacyPagesManifest, null, 2)}\n`
                      )
                    );
                  }
                }
              );
            }
          );
        }
      });
    }

    return config;
  }
};

export default nextConfig;
