/**
 * Classe / groupe d’élèves géré par l’animateur.
 * Une session peut être liée à une classe (liste de noms) ou aucune (inscription libre).
 */
export type SchoolClass = {
  id: string;
  name: string;
  /** Noms uniques des élèves de la classe. */
  names: string[];
};

export type SchoolClassSummary = {
  id: string;
  name: string;
  studentCount: number;
};
