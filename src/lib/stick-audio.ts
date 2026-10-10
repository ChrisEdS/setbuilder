export type StickFileRef = {
  name: string;
  path: string;
};

function foldPath(value: string): string {
  return value.replaceAll("\\", "/").replace(/^\/+/, "").toLowerCase();
}

/** Match a rekordbox file path to a file the browser still holds from the stick folder. */
export function matchStickFile(
  files: StickFileRef[],
  filePath: string,
  filename: string,
): StickFileRef | null {
  const wanted = foldPath(filePath);
  const base = foldPath(filename || wanted.split("/").pop() || "");
  let byName: StickFileRef | null = null;
  for (const file of files) {
    const rel = foldPath(file.path || file.name);
    if (wanted && (rel.endsWith(wanted) || wanted.endsWith(rel))) return file;
    if (base && (file.name.toLowerCase() === base || rel.endsWith(`/${base}`))) byName = file;
  }
  return byName;
}

const urls = new Map<string, string>();
let stickFiles: File[] = [];

export function rememberStickFiles(files: File[]) {
  for (const url of urls.values()) URL.revokeObjectURL(url);
  urls.clear();
  stickFiles = files;
}

export function stickFileCount(): number {
  return stickFiles.length;
}

export function stickAudioUrl(filePath: string, filename = ""): string | null {
  if (typeof URL === "undefined" || !stickFiles.length) return null;
  const match = matchStickFile(
    stickFiles.map((file) => ({
      name: file.name,
      path: file.webkitRelativePath || file.name,
    })),
    filePath,
    filename,
  );
  if (!match) return null;
  const key = match.path || match.name;
  const existing = urls.get(key);
  if (existing) return existing;
  const file = stickFiles.find(
    (item) => (item.webkitRelativePath || item.name) === key,
  );
  if (!file) return null;
  const url = URL.createObjectURL(file);
  urls.set(key, url);
  return url;
}
