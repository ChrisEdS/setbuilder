import type {
  SetPhaseId,
  SetSlotKind,
  TrackRole,
  TransitionVerb,
} from "../set";
import type { Translate } from "./core";

/** Translated names for the fixed set vocabulary. Components use these instead of PHASES[..].label. */
export const phaseLabel = (t: Translate, id: SetPhaseId) =>
  t(`domain.phase.${id}.label`);
export const phaseHint = (t: Translate, id: SetPhaseId) =>
  t(`domain.phase.${id}.hint`);
export const roleLabel = (t: Translate, id: TrackRole) =>
  t(`domain.role.${id}.label`);
export const roleHint = (t: Translate, id: TrackRole) =>
  t(`domain.role.${id}.hint`);
export const roleExplain = (t: Translate, id: TrackRole) =>
  t(`domain.role.${id}.explain`);
export const slotLabel = (t: Translate, id: SetSlotKind) =>
  t(`domain.slot.${id}.label`);
export const slotHint = (t: Translate, id: SetSlotKind) =>
  t(`domain.slot.${id}.hint`);
export const transitionLabel = (t: Translate, id: TransitionVerb) =>
  t(`domain.transition.${id}`);
export const transitionHint = (t: Translate, id: TransitionVerb) =>
  t(`domain.transition.${id}.hint`);
