/**
 * Liste des élèves renseignée par l’animateur en début d’année.
 * Les participants choisissent leur nom dans cette liste pour rejoindre une session.
 */
export type StudentRoster = {
  /** Noms uniques, triés pour l’affichage (ordre alphabétique recommandé). */
  names: string[];
};
