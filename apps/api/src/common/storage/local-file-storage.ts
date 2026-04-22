import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { access, mkdir } from "node:fs/promises";
import path from "node:path";

export const DEFAULT_STORAGE_DIRECTORY = "storage/uploads";
export const DEFAULT_ALLOWED_FILE_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xlsx",
  ".zip",
  ".txt"
] as const;

export interface LocalStorageConfig {
  allowedExtensions: string[];
  maxFileSizeBytes: number;
  rootDir: string;
}

export interface StoredFileDescriptor {
  absolutePath: string;
  storedName: string;
}

export function findWorkspaceRoot(startDirectory: string = process.cwd()): string {
  let currentDirectory = path.resolve(startDirectory);

  while (true) {
    if (existsSync(path.join(currentDirectory, "pnpm-workspace.yaml"))) {
      return currentDirectory;
    }

    const parentDirectory = path.dirname(currentDirectory);

    if (parentDirectory === currentDirectory) {
      return path.resolve(startDirectory);
    }

    currentDirectory = parentDirectory;
  }
}

export function resolveStorageRootDirectory(directory: string | undefined): string {
  const workspaceRoot = findWorkspaceRoot();
  const configuredDirectory = directory?.trim() || DEFAULT_STORAGE_DIRECTORY;

  return path.isAbsolute(configuredDirectory)
    ? configuredDirectory
    : path.resolve(workspaceRoot, configuredDirectory);
}

export async function ensureStorageRootDirectory(rootDir: string): Promise<void> {
  await mkdir(rootDir, { recursive: true });
}

export function sanitizeOriginalFileName(fileName: string): string {
  const baseName = path.basename(fileName).trim();
  const normalized = baseName.replace(/[\u0000-\u001f\u007f/\\]+/g, "_");

  return normalized || "file";
}

export function getFileExtension(fileName: string): string {
  return path.extname(fileName).toLowerCase();
}

export function createStoredFileName(originalName: string): string {
  const extension = getFileExtension(originalName);

  return `${randomUUID()}${extension}`;
}

export function resolveStoredFilePath(
  rootDir: string,
  storedName: string
): StoredFileDescriptor {
  const normalizedStoredName = path.basename(storedName);
  const absolutePath = path.resolve(rootDir, normalizedStoredName);
  const normalizedRoot = path.resolve(rootDir);

  if (
    normalizedStoredName !== storedName ||
    (absolutePath !== normalizedRoot &&
      !absolutePath.startsWith(`${normalizedRoot}${path.sep}`))
  ) {
    throw new Error("Unsafe stored file path.");
  }

  return {
    storedName: normalizedStoredName,
    absolutePath
  };
}

export async function assertStoredFileExists(
  rootDir: string,
  storedName: string
): Promise<string> {
  const descriptor = resolveStoredFilePath(rootDir, storedName);

  await access(descriptor.absolutePath);

  return descriptor.absolutePath;
}

export function buildDownloadContentDisposition(fileName: string): string {
  const safeFileName = sanitizeOriginalFileName(fileName).replace(/"/g, "'");
  const encodedFileName = encodeURIComponent(safeFileName);

  return `attachment; filename="${safeFileName}"; filename*=UTF-8''${encodedFileName}`;
}

export function formatFileSizeLimit(fileSizeBytes: number): string {
  if (fileSizeBytes < 1024 * 1024) {
    return `${Math.max(Math.round(fileSizeBytes / 1024), 1)} КБ`;
  }

  return `${(fileSizeBytes / (1024 * 1024)).toFixed(1)} МБ`;
}
