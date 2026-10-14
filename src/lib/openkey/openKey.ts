const PITCHES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;

/** Camelot / Open Key number for each major pitch class, starting at C. */
const MAJOR_NUMBERS = [8, 3, 10, 5, 12, 7, 2, 9, 4, 11, 6, 1] as const;

const FLATS: Record<string, (typeof PITCHES)[number]> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

export const LOW_KEY_CONFIDENCE = 0.5;

export function isLowConfidence(strength: number): boolean {
  return !(strength >= LOW_KEY_CONFIDENCE);
}

export function keyLabel(key: string, scale: string): string {
  const name = scale.toLowerCase() === "minor" ? "minor" : "major";
  return `${key} ${name}`;
}

export function openKeyCode(key: string, scale: string): string | null {
  const scaleName = scale.toLowerCase();
  if (scaleName !== "major" && scaleName !== "minor") return null;
  const pitch = FLATS[key] ?? key;
  const index = PITCHES.indexOf(pitch as (typeof PITCHES)[number]);
  if (index < 0) return null;
  const minor = scaleName === "minor";
  const number = minor ? MAJOR_NUMBERS[(index + 3) % 12] : MAJOR_NUMBERS[index];
  return `${number}${minor ? "A" : "B"}`;
}

/** Previous, next, and relative major/minor on the Open Key wheel. */
export function mixesWith(code: string): string[] {
  const match = /^(\d{1,2})([AB])$/.exec(code);
  if (!match) return [];
  const number = Number(match[1]);
  const letter = match[2];
  if (number < 1 || number > 12) return [];
  const previous = number === 1 ? 12 : number - 1;
  const next = number === 12 ? 1 : number + 1;
  const relative = letter === "A" ? "B" : "A";
  return [`${previous}${letter}`, `${next}${letter}`, `${number}${relative}`];
}
