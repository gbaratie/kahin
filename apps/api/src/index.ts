import './loadEnv.js';
import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import { openApiSpec } from './swagger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { authRoutes } from './routes/auth.js';
import { quizRoutes } from './routes/quiz.js';
import { sessionRoutes } from './routes/session.js';
import { QUIZ_JSON_STORAGE_PATH } from './container.js';

const app = express();
const PORT = process.env.PORT ?? 4000;

app.use(cors());
app.use(express.json());

app.use('/docs', swaggerUi.serve, swaggerUi.setup(openApiSpec));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'kahin-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/session', sessionRoutes);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
  console.log(`Quiz storage: ${QUIZ_JSON_STORAGE_PATH}`);
});
