import type { Translate } from "@/lib/i18n";
import {
  applyStickSetMode,
  type RekordboxStickSet,
  type StickSetLoadMode,
} from "@/lib/rekordbox-stick";
import type { SetDraft } from "@/lib/set";

export type PlaylistLoadResult = {
  draft: SetDraft;
  undo: SetDraft | null;
};

/** Pure replace/merge decision, including the snapshot offered by Undo. */
export function applyPlaylistLoad(
  current: SetDraft,
  set: RekordboxStickSet,
  mode: StickSetLoadMode,
  t?: Translate,
): PlaylistLoadResult {
  return {
    draft: applyStickSetMode(current, set, mode, t),
    undo: mode === "replace" && current.tracks.length > 0 ? current : null,
  };
}

export function undoPlaylistLoad(current: SetDraft, undo: SetDraft | null): SetDraft {
  return undo ?? current;
}
