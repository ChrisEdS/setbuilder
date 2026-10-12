// Area "crates": keys start with "crates.". Declare `de` first, then type `en` against it.
const de = {} as const;

const en: Record<keyof typeof de, string> = {};

export const crates = { de, en };
