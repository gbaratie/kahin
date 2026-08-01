import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  InMemoryBankStore,
  InMemoryQuestionRepository,
  InMemoryThemeRepository,
} from './InMemoryQuizRepository.js';

describe('tri thématique banque', () => {
  it('ordonne par sortOrder de thématique puis label', async () => {
    const store = new InMemoryBankStore();
    const themes = new InMemoryThemeRepository(store);
    const questions = new InMemoryQuestionRepository(store);

    await themes.save({ id: 't2', name: 'Bêta', sortOrder: 2 });
    await themes.save({ id: 't1', name: 'Alpha', sortOrder: 1 });

    await questions.save({
      id: 'q3',
      label: 'Sans thème Z',
      choices: [],
    });
    await questions.save({
      id: 'q2',
      label: 'Banana',
      themeId: 't2',
      choices: [],
    });
    await questions.save({
      id: 'q1',
      label: 'Apple',
      themeId: 't1',
      choices: [],
    });
    await questions.save({
      id: 'q0',
      label: 'Zebra',
      themeId: 't1',
      choices: [],
    });

    const byLabel = await questions.list({ sort: 'label' });
    assert.deepEqual(
      byLabel.map((q) => q.id),
      ['q1', 'q2', 'q3', 'q0']
    );

    const byTheme = await questions.list({ sort: 'theme' });
    assert.deepEqual(
      byTheme.map((q) => q.id),
      ['q1', 'q0', 'q2', 'q3']
    );
  });
});
