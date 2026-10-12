// Area "builder": keys start with "builder.". Declare `de` first, then type `en` against it.
const de = {} as const;

const en: Record<keyof typeof de, string> = {};

export const builder = { de, en };
