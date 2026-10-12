// Area "analysis": keys start with "analysis.". Declare `de` first, then type `en` against it.
const de = {} as const;

const en: Record<keyof typeof de, string> = {};

export const analysis = { de, en };
