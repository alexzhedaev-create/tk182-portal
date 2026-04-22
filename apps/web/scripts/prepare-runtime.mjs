import { readdir, rm } from "node:fs/promises";
import { resolve } from "node:path";

const pagesDirectory = resolve(process.cwd(), "pages");

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

await removeEmptyPagesDirectory();
