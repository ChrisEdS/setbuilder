// Area "library": keys start with "library.". Declare `de` first, then type `en` against it.
const de = {} as const;

const en: Record<keyof typeof de, string> = {};

export const library = { de, en };
