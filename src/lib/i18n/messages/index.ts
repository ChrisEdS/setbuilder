import { analysis } from "./analysis";
import { api } from "./api";
import { builder } from "./builder";
import { common } from "./common";
import { crates } from "./crates";
import { domain } from "./domain";
import { exports_ } from "./exports";
import { library } from "./library";

/**
 * One file per area. Every key starts with the area prefix (`builder.`, `crates.` …),
 * so areas never collide. Each file declares `de` first and types `en` against it:
 * a missing English key is a compile error.
 */
export const areas = {
  common,
  domain,
  builder,
  crates,
  library,
  analysis,
  exports: exports_,
  api,
} as const;

type KeysOf<T> = T extends unknown ? keyof T : never;

export type MessageKey = KeysOf<(typeof areas)[keyof typeof areas]["de"]> & string;

export const messages = {
  de: Object.assign({}, ...Object.values(areas).map((area) => area.de)),
  en: Object.assign({}, ...Object.values(areas).map((area) => area.en)),
} as { de: Record<MessageKey, string>; en: Record<MessageKey, string> };
