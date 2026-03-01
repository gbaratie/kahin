# Configuration Render pour l’API (monorepo)

## Ce qui ne va pas dans ta config actuelle

1. **Root Directory = `apps/api/dist`**  
   `dist` est le **dossier de sortie** du build (généré par `tsc`). Il n’y a pas de `package.json` ni de sources dedans, donc Render ne peut pas y faire `npm install` ni `npm run build`. Il faut partir de la racine du dépôt ou de `apps/api`, pas de `dist`.

2. **Build Command**  
   Le préfixe `apps/api/dist/ $` ressemble à un copier-coller du terminal et n’a rien à faire dans la commande. Surtout, si la racine est `apps/api/dist`, installer et builder depuis ce dossier ne peut pas fonctionner.

3. **Start Command avec `yarn`**  
   Le projet utilise **npm** (scripts dans `package.json`, pas de `yarn.lock`). Il vaut mieux rester cohérent et utiliser `npm` (ou directement `node`).

4. **Monorepo**  
   L’API dépend des workspaces `@kahin/qcm-domain`, `@kahin/qcm-application`, `@kahin/qcm-infrastructure`. Il faut installer et builder depuis la **racine du repo** pour que ces dépendances soient disponibles, puis lancer l’app depuis `apps/api`.

---

## Configuration recommandée sur Render

À mettre dans l’interface Render pour le service de l’API :

| Champ              | Valeur                              |
| ------------------ | ----------------------------------- |
| **Root Directory** | _(laisser vide)_                    |
| **Build Command**  | `npm ci && npm run build:api`       |
| **Start Command**  | `cd apps/api && node dist/index.js` |

- **Root Directory vide** : Render travaille à la racine du dépôt, donc `npm ci` installe tout le monorepo (dont les workspaces) et `npm run build:api` build les packages puis l’API.
- **Start Command** : on se place dans `apps/api` puis on lance le binaire compilé `dist/index.js`, comme en local avec `npm run start` dans `apps/api`.

Tu peux garder **Node**, **Branch: main** et **Region** tels quels.

Après avoir appliqué ces changements, sauvegarde et relance un déploiement.
