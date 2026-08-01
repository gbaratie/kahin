/** Mode d’une question au sein d’un QCM (pas de la banque). */
export type PlayMode = 'course' | 'discovery';

export function parsePlayMode(value: unknown): PlayMode {
  return value === 'course' ? 'course' : 'discovery';
}

export function isCoursePlayMode(
  value: { playMode?: PlayMode } | null | undefined
): boolean {
  return value?.playMode === 'course';
}
