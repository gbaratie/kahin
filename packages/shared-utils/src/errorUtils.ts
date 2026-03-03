/**
 * Extrait un message d'erreur lisible depuis une valeur inconnue (throw ou rejection).
 */
export function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === 'string') return e;
  return String(e);
}

/**
 * Normalise une valeur inconnue en instance Error.
 */
export function toError(e: unknown): Error {
  if (e instanceof Error) return e;
  return new Error(getErrorMessage(e));
}
