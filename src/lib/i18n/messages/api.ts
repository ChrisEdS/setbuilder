// Area "api": keys start with "api.". Declare `de` first, then type `en` against it.
const de = {} as const;

const en: Record<keyof typeof de, string> = {};

export const api = { de, en };
