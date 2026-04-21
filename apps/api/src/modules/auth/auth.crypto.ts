import { createHash, randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const SCRYPT_KEY_LENGTH = 64;
const PASSWORD_ALGORITHM = "scrypt";
const SALT_BYTES = 16;
const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = Buffer.from(
    (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as ArrayBuffer
  ).toString("hex");

  return `${PASSWORD_ALGORITHM}$${salt}$${derivedKey}`;
}

export async function verifyPassword(
  password: string,
  storedPasswordHash: string
): Promise<boolean> {
  const [algorithm, salt, storedHash] = storedPasswordHash.split("$");

  if (algorithm !== PASSWORD_ALGORITHM || !salt || !storedHash) {
    return false;
  }

  const candidateHash = Buffer.from(
    (await scryptAsync(password, salt, SCRYPT_KEY_LENGTH)) as ArrayBuffer
  );
  const expectedHash = Buffer.from(storedHash, "hex");

  if (candidateHash.length !== expectedHash.length) {
    return false;
  }

  return timingSafeEqual(candidateHash, expectedHash);
}

export function createSessionToken(): string {
  return randomBytes(48).toString("hex");
}

export function hashSessionToken(sessionToken: string): string {
  return createHash("sha256").update(sessionToken).digest("hex");
}
