/**
 * Mémorisation du nom choisi par l’élève (localStorage, même navigateur).
 */
const PARTICIPANT_NAME_KEY = 'kahin_participant_name';

export function getRememberedParticipantName(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const value = localStorage.getItem(PARTICIPANT_NAME_KEY);
    const trimmed = value?.trim();
    return trimmed || null;
  } catch {
    return null;
  }
}

export function setRememberedParticipantName(name: string): void {
  if (typeof window === 'undefined') return;
  try {
    const trimmed = name.trim();
    if (!trimmed) {
      localStorage.removeItem(PARTICIPANT_NAME_KEY);
      return;
    }
    localStorage.setItem(PARTICIPANT_NAME_KEY, trimmed);
  } catch {
    // Quota / mode privé : on ignore, le parcours reste utilisable.
  }
}

export function clearRememberedParticipantName(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(PARTICIPANT_NAME_KEY);
  } catch {
    // ignore
  }
}
