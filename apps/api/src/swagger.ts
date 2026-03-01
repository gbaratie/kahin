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
                      required: ['label', 'choices'],
                      properties: {
                        label: { type: 'string' },
                        choices: {
                          type: 'array',
                          items: {
                            type: 'object',
                            properties: { label: { type: 'string' } },
                          },
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
                required: ['participantId', 'questionId', 'choiceId'],
                properties: {
                  participantId: { type: 'string' },
                  questionId: { type: 'string' },
                  choiceId: { type: 'string' },
                },
              },
            },
          },
        },
        responses: {
          '204': { description: 'Réponse enregistrée' },
          '400': {
            description:
              "Champs manquants ou session n'accepte plus les réponses",
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
  },
};
