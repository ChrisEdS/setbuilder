import type { MessageKey, Translate, Vars } from "./core";

/**
 * An error whose message is shown to the user. It carries a message key instead of text,
 * so the place that finally shows it (a component or an API route) picks the language.
 * `message` holds the German text so logs and old callers still read well.
 */
export class LocalizedError extends Error {
  readonly key: MessageKey;
  readonly vars?: Vars;

  constructor(key: MessageKey, vars?: Vars, germanText?: string) {
    super(germanText ?? key);
    this.name = "LocalizedError";
    this.key = key;
    this.vars = vars;
  }
}

/** Text of an error in the current language. Plain errors keep their own message. */
export function errorText(
  error: unknown,
  t: Translate,
  fallbackKey?: MessageKey,
): string {
  if (error instanceof LocalizedError) return t(error.key, error.vars);
  if (error instanceof Error && error.message) return error.message;
  return fallbackKey ? t(fallbackKey) : "";
}
