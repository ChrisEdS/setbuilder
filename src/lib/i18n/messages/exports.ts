// Area "exports": keys start with "exports.". Declare `de` first, then type `en` against it.
const de = {} as const;

const en: Record<keyof typeof de, string> = {};

export const exports_ = { de, en };
