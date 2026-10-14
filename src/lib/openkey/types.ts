export type Analysis = {
  keyLabel: string | null;
  openKey: string | null;
  strength: number;
  uncertain: boolean;
  bpm: number | null;
  energy: number;
  mixesWith: string[];
};
