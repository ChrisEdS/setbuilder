import { LocalizedError } from "@/lib/i18n/error";

/**
 * rekordbox keeps exportLibrary.db (and sometimes the volume) open.
 * Reading export.pdb and MP3s can still hit EBUSY for a moment.
 */
export function isResourceBusy(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { code?: string | number; errno?: number; message?: string; name?: string };
  if (err.code === "EBUSY" || err.code === "EAGAIN" || err.code === 16) return true;
  if (err.errno === 16) return true;
  const text = `${err.name ?? ""} ${err.message ?? ""}`;
  return /\b(ebusy|eagain|resource busy|busy or locked|sharing violation|being used by another process)\b/i.test(
    text,
  );
}

export function isStickReadBusy(error: unknown): boolean {
  return (
    isResourceBusy(error) ||
    (error instanceof LocalizedError && error.key === "exports.stick.readBusy")
  );
}

export function stickReadBusyError(): LocalizedError {
  return new LocalizedError(
    "exports.stick.readBusy",
    undefined,
    "Der Stick ist kurz belegt. Noch einmal versuchen — zum Lesen und Messen muss rekordbox nicht zu sein.",
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function withBusyRetry<T>(
  run: () => Promise<T>,
  options?: { attempts?: number; waitMs?: number },
): Promise<T> {
  const attempts = options?.attempts ?? 5;
  const waitMs = options?.waitMs ?? 50;
  let last: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await run();
    } catch (error) {
      last = error;
      if (!isResourceBusy(error) || i === attempts - 1) throw error;
      await sleep(waitMs * (i + 1));
    }
  }
  throw last;
}

function asReadBusy(error: unknown): never {
  if (isStickReadBusy(error)) throw stickReadBusyError();
  throw error;
}

/** Open a File System Access handle; retry EBUSY instead of asking to quit rekordbox. */
export async function getStickFile<T>(handle: { getFile(): Promise<T> }): Promise<T> {
  try {
    return await withBusyRetry(() => handle.getFile());
  } catch (error) {
    asReadBusy(error);
  }
}

/** Read bytes from a File/Blob; same retry as getStickFile. */
export async function readBlobBuffer(blob: {
  arrayBuffer(): Promise<ArrayBuffer>;
}): Promise<ArrayBuffer> {
  try {
    return await withBusyRetry(() => blob.arrayBuffer());
  } catch (error) {
    asReadBusy(error);
  }
}
