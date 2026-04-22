import { unlink, writeFile } from "node:fs/promises";

import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";

import { getApplicationConfig } from "../../common/config/environment";
import {
  assertStoredFileExists,
  createStoredFileName,
  ensureStorageRootDirectory,
  formatFileSizeLimit,
  getFileExtension,
  resolveStoredFilePath,
  sanitizeOriginalFileName
} from "../../common/storage/local-file-storage";

export interface UploadedBinaryFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface SavedVersionFile {
  mimeType: string;
  originalName: string;
  sizeBytes: number;
  storedName: string;
}

const DEFAULT_MIME_TYPE = "application/octet-stream";

const ALLOWED_MIME_TYPES: Record<string, readonly string[]> = {
  ".pdf": [DEFAULT_MIME_TYPE, "application/pdf"],
  ".doc": [DEFAULT_MIME_TYPE, "application/msword"],
  ".docx": [
    DEFAULT_MIME_TYPE,
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip"
  ],
  ".xlsx": [
    DEFAULT_MIME_TYPE,
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/zip"
  ],
  ".zip": [DEFAULT_MIME_TYPE, "application/zip", "application/x-zip-compressed"],
  ".txt": [DEFAULT_MIME_TYPE, "text/plain"]
};

@Injectable()
export class ApprovalFileStorageService {
  private readonly logger = new Logger(ApprovalFileStorageService.name);
  private readonly storageConfig = getApplicationConfig().storage;
  private readonly allowedExtensions = new Set(
    this.storageConfig.allowedExtensions.map((extension) => extension.toLowerCase())
  );

  getRootDirectory(): string {
    return this.storageConfig.rootDir;
  }

  async saveUploadedFile(file: UploadedBinaryFile | undefined): Promise<SavedVersionFile> {
    const normalizedFile = this.normalizeFile(file);
    await ensureStorageRootDirectory(this.storageConfig.rootDir);

    const storedName = createStoredFileName(normalizedFile.originalName);
    const filePath = resolveStoredFilePath(this.storageConfig.rootDir, storedName);

    await writeFile(filePath.absolutePath, normalizedFile.buffer);

    return {
      storedName,
      originalName: normalizedFile.originalName,
      mimeType: normalizedFile.mimeType,
      sizeBytes: normalizedFile.sizeBytes
    };
  }

  async resolveExistingFilePath(storedName: string): Promise<string> {
    try {
      return await assertStoredFileExists(this.storageConfig.rootDir, storedName);
    } catch {
      throw new NotFoundException("Файл не найден в локальном хранилище.");
    }
  }

  async deleteStoredFile(storedName: string): Promise<void> {
    try {
      const descriptor = resolveStoredFilePath(this.storageConfig.rootDir, storedName);
      await unlink(descriptor.absolutePath);
    } catch (error) {
      if (
        error &&
        typeof error === "object" &&
        "code" in error &&
        error.code === "ENOENT"
      ) {
        return;
      }

      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Failed to remove stored file ${storedName}: ${message}`);
    }
  }

  private normalizeFile(file: UploadedBinaryFile | undefined): {
    buffer: Buffer;
    mimeType: string;
    originalName: string;
    sizeBytes: number;
  } {
    if (!file) {
      throw new BadRequestException("Выберите файл для загрузки.");
    }

    if (!file.buffer || file.size <= 0) {
      throw new BadRequestException("Загруженный файл пустой.");
    }

    const originalName = sanitizeOriginalFileName(file.originalname);
    const extension = getFileExtension(originalName);

    if (!extension || !this.allowedExtensions.has(extension)) {
      throw new BadRequestException(
        "Недопустимый формат файла. Разрешены PDF, DOC, DOCX, XLSX, ZIP и TXT."
      );
    }

    if (file.size > this.storageConfig.maxFileSizeBytes) {
      throw new BadRequestException(
        `Размер файла превышает допустимый предел (${formatFileSizeLimit(
          this.storageConfig.maxFileSizeBytes
        )}).`
      );
    }

    const mimeType = file.mimetype?.trim() || DEFAULT_MIME_TYPE;
    const allowedMimeTypes = ALLOWED_MIME_TYPES[extension] ?? [DEFAULT_MIME_TYPE];

    if (!allowedMimeTypes.includes(mimeType)) {
      throw new BadRequestException(
        "Недопустимый MIME-тип файла для выбранного расширения."
      );
    }

    return {
      buffer: file.buffer,
      originalName,
      mimeType,
      sizeBytes: file.size
    };
  }
}
