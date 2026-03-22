export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'Kahin QCM API',
    version: '1.0.0',
    description:
      'API pour créer des quiz, lancer des sessions et gérer les réponses des participants.',
  },
  servers: [{ url: 'http://localhost:4000', description: 'Développement' }],
  paths: {
    '/health': {
      get: {
        summary: 'Santé du service',
        tags: ['Health'],
        responses: {
          '200': {
            description: 'Service opérationnel',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', example: 'ok' },
                    service: { type: 'string', example: 'kahin-api' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/quiz': {
      get: {
        summary: 'Liste des quiz (id et titre)',
        tags: ['Quiz'],
        responses: {
          '200': {
            description: 'Tableau des quiz',
            content: {
              'application/json': {
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      id: { type: 'string' },
                      title: { type: 'string' },
                    },
                  },
                },
              },
            },
          },
          '500': { description: 'Erreur serveur' },
        },
      },
      post: {
        summary: 'Créer un quiz',
        tags: ['Quiz'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['title', 'questions'],
                properties: {
                  title: { type: 'string', example: 'Mon quiz' },
                  questions: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        label: { type: 'string' },
                        type: {
                          type: 'string',
                          enum: ['qcm', 'word_cloud'],
                          description:
                            'qcm = choix multiples, word_cloud = nuage de mots (pas de choix)',
                        },
                        choices: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: { label: { type: 'string' } },
                          },
                          description:
                            'Obligatoire pour type qcm, vide pour word_cloud',
                        },
                        correctChoiceIndex: { type: 'number' },
                        timerSeconds: {
                          type: 'number',
                          description: 'Défaut 10 (qcm) ou 180 (word_cloud)',
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Quiz créé' },
          '400': { description: 'title et questions requis' },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/api/quiz/{quizId}': {
      get: {
        summary: 'Récupérer un quiz par ID',
        tags: ['Quiz'],
        parameters: [
          {
            name: 'quizId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Détails du quiz' },
          '404': { description: 'Quiz non trouvé' },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/api/quiz/{quizId}/launch': {
      post: {
        summary: 'Lancer une session pour un quiz',
        tags: ['Quiz'],
        parameters: [
          {
            name: 'quizId',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '201': { description: 'Session lancée' },
          '404': { description: 'Quiz non trouvé' },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/api/session/{id}': {
      get: {
        summary: 'Récupérer une session',
        tags: ['Session'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'Détails de la session' },
          '404': { description: 'Session non trouvée' },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/api/session/join': {
      post: {
        summary: 'Rejoindre une session avec un code',
        tags: ['Session'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['code', 'participantName'],
                properties: {
                  code: { type: 'string', example: 'ABC123' },
                  participantName: { type: 'string', example: 'Jean' },
                },
              },
            },
          },
        },
        responses: {
          '201': { description: 'Participant inscrit' },
          '400': {
            description: 'code et participantName requis ou session invalide',
          },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/api/session/{id}/answer': {
      post: {
        summary: 'Envoyer une réponse à une question',
        tags: ['Session'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['participantId', 'questionId'],
                properties: {
                  participantId: { type: 'string' },
                  questionId: { type: 'string' },
                  choiceId: {
                    type: 'string',
                    description:
                      'Pour une question QCM : id du choix sélectionné',
                  },
                  word: {
                    type: 'string',
                    description:
                      'Pour une question nuage de mots : mot à ajouter (plusieurs appels possibles)',
                  },
                },
                description:
                  'Fournir soit choiceId (QCM) soit word (nuage de mots), selon le type de la question courante',
              },
            },
          },
        },
        responses: {
          '204': { description: 'Réponse enregistrée' },
          '400': {
            description:
              "participantId et questionId requis ; choiceId ou word selon le type de question ; session n'accepte plus les réponses",
          },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/api/session/{id}/next': {
      post: {
        summary: 'Passer à la question suivante',
        tags: ['Session'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        responses: {
          '200': { description: 'État après passage à la question suivante' },
          '404': { description: 'Session non trouvée' },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
    '/api/session/{id}/results.csv': {
      get: {
        summary:
          'Exporter les résultats en CSV (animateur, Bearer JWT ; session terminée uniquement)',
        tags: ['Session'],
        parameters: [
          {
            name: 'id',
            in: 'path',
            required: true,
            schema: { type: 'string' },
          },
        ],
        security: [{ bearerAuth: [] }],
        responses: {
          '200': {
            description: 'Fichier CSV (classement et détail des réponses)',
            content: {
              'text/csv': {
                schema: { type: 'string', format: 'binary' },
              },
            },
          },
          '400': { description: 'Session non terminée' },
          '401': { description: 'Non authentifié' },
          '404': { description: 'Session ou quiz non trouvé' },
          '500': { description: 'Erreur serveur' },
        },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
  },
};
