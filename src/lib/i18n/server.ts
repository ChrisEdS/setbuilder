import { createTranslate, langFromHeaders, type Lang, type Translate } from "./core";

/** Language of an API request: the "setform-lang" cookie, then Accept-Language. */
export function requestLang(request: Request): Lang {
  return langFromHeaders(
    request.headers.get("cookie"),
    request.headers.get("accept-language"),
  );
}

/** Translator for an API request. */
export function requestT(request: Request): Translate {
  return createTranslate(requestLang(request));
}
