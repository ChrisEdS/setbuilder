/**
 * Load essentia's web WASM outside the Turbopack graph.
 * Bundling essentia-wasm.es.js pulls Node `fs`; the web factory must be
 * called (async) with locateFile pointing at /essentia/*.wasm.
 *
 * The web glue is compiled for HTML (ENVIRONMENT_IS_WEB=true) and touches
 * `document` / requires `window` or `importScripts`. Module workers have
 * neither — stub them when evaluating the UMD source.
 */

type EssentiaFactory = (config?: {
  INITIAL_MEMORY?: number;
  print?: (text: unknown) => void;
  printErr?: (text: unknown) => void;
  locateFile?: (path: string, prefix?: string) => string;
}) => Promise<unknown>;

declare global {
  // eslint-disable-next-line no-var
  var EssentiaWASM: EssentiaFactory | undefined;
}

let loading: Promise<unknown> | null = null;

/**
 * The shipped glue starts at 16MB and cannot be relied on to grow inside a
 * worker. A 45s window at the sound-card rate (48 or 96 kHz) then makes
 * Essentia throw, which surfaces as the "exception catching is disabled" line.
 */
const INITIAL_MEMORY = 64 * 1024 * 1024;

function quietEssentiaLog(text: unknown): void {
  const line = String(text);
  if (line.includes("Exception catching is disabled")) return;
  if (line.includes("Compiled code throwing an exception")) return;
  if (line.startsWith("Heap resize")) return;
}

function assetOrigin(): string {
  try {
    return new URL(self.location.href).origin;
  } catch {
    return "";
  }
}

function essentiaAsset(name: string): string {
  return `${assetOrigin()}/essentia/${name}`;
}

async function loadFactory(): Promise<EssentiaFactory> {
  if (typeof self.EssentiaWASM === "function") return self.EssentiaWASM;

  const source = await fetch(essentiaAsset("essentia-wasm.web.js")).then(
    (response) => {
      if (!response.ok) {
        throw new Error(`Could not load essentia WASM glue (${response.status})`);
      }
      return response.text();
    },
  );

  // Module workers cannot importScripts; evaluate UMD with web shims.
  // eslint-disable-next-line no-new-func
  const factory = new Function(
    "workerGlobal",
    `
    var self = workerGlobal;
    var window = workerGlobal;
    var document = { currentScript: null, title: "" };
    var importScripts = function () {};
    ${source};
    return EssentiaWASM;
    `,
  )(self) as EssentiaFactory;

  if (typeof factory !== "function") {
    throw new Error("essentia-wasm.web.js did not return a factory");
  }
  self.EssentiaWASM = factory;
  return factory;
}

/** Load (once) the Essentia WASM Module for the analysis worker. */
export function loadEssentiaWasm(): Promise<unknown> {
  loading ??= (async () => {
    const factory = await loadFactory();
    return factory({
      INITIAL_MEMORY,
      print: quietEssentiaLog,
      printErr: quietEssentiaLog,
      locateFile: (path) => {
        const name = path.split("/").pop() || path;
        return essentiaAsset(name);
      },
    });
  })();
  return loading;
}
