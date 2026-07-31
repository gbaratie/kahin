# Connexion Microsoft (comptes école) pour les participants

Les étudiants peuvent s’identifier avec leur compte Microsoft Entra ID (Azure AD) de l’école. Le **nom officiel** du compte est alors utilisé dans le classement et l’export CSV des notes.

L’animateur continue d’utiliser la connexion classique (`ADMIN_USERNAME` / `ADMIN_PASSWORD`).

## Prérequis Azure (Entra ID)

1. Dans le [portail Azure](https://portal.azure.com) → **Microsoft Entra ID** → **Inscriptions d’applications** → **Nouvelle inscription**.
2. Nom : ex. `Kahin QCM`.
3. Types de comptes : **Comptes dans cet annuaire organisationnel uniquement** (tenant de l’école).
4. URI de redirection (type **Web**) :
   - Prod : `https://<votre-api.onrender.com>/api/auth/microsoft/callback`
   - Local : `http://localhost:4000/api/auth/microsoft/callback`
5. Créer un **secret client** (Certificats et secrets).
6. Noter : **ID d’application (client)**, **ID de l’annuaire (locataire)**, **valeur du secret**.

Permissions API (délégation) : `openid`, `profile`, `email` (généralement suffisantes pour le jeton d’ID).

## Variables d’environnement (API)

À définir sur Render (ou dans `apps/api/.env` en local) :

| Variable | Exemple | Rôle |
| -------- | ------- | ---- |
| `MICROSOFT_CLIENT_ID` | `xxxxxxxx-xxxx-…` | ID d’application |
| `MICROSOFT_CLIENT_SECRET` | `…` | Secret client |
| `MICROSOFT_TENANT_ID` | `xxxxxxxx-xxxx-…` | Tenant de l’école (pas `common` si vous voulez restreindre à l’école) |
| `MICROSOFT_REDIRECT_URI` | `https://api…/api/auth/microsoft/callback` | Doit correspondre exactement à Azure |
| `FRONT_ORIGIN` | `https://user.github.io` ou `http://localhost:3000` | Origine du front (sans chemin de base) pour le retour OAuth |
| `MICROSOFT_AUTH_REQUIRED` | `true` / `false` | Si `true`, impossible de rejoindre sans compte Microsoft |
| `ADMIN_AUTH_SECRET` | (déjà requis) | Sert aussi à signer les jetons participant et le `state` OAuth |

Sans ces variables Microsoft, le formulaire de join reste en mode nom libre (comportement historique).

## Flux

1. Le participant saisit le code de session et clique sur **Se connecter avec Microsoft**.
2. Le front redirige vers `GET /api/auth/microsoft` (API).
3. L’API redirige vers Microsoft ; après login, Microsoft rappelle `/api/auth/microsoft/callback`.
4. L’API lit le nom dans le jeton d’ID, émet un jeton participant court (30 min), et renvoie vers le front (`FRONT_ORIGIN` + `returnPath`) avec `microsoft_token`.
5. Au **Rejoindre**, le front envoie ce jeton ; l’API impose le nom Microsoft (le nom libre est ignoré).

## Front

Aucune variable front supplémentaire : le statut est lu via `GET /api/auth/microsoft/status` dès que `NEXT_PUBLIC_API_URL` est défini.

Le `returnPath` inclut le `basePath` GitHub Pages (ex. `/kahin/`) grâce à `window.location.pathname`.
