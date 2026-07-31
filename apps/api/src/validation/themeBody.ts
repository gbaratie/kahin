import type { CreateThemeInput, UpdateThemeInput } from '@kahin/qcm-application';

export function validateThemeCreateBody(body: {
  name?: unknown;
}): CreateThemeInput {
  if (body.name == null || String(body.name).trim() === '') {
    throw new Error('name required');
  }
  return { name: String(body.name) };
}

export function validateThemeUpdateBody(body: {
  name?: unknown;
  sortOrder?: unknown;
}): UpdateThemeInput {
  if (body.name == null || String(body.name).trim() === '') {
    throw new Error('name required');
  }
  return {
    name: String(body.name),
    sortOrder:
      typeof body.sortOrder === 'number' ? body.sortOrder : undefined,
  };
}
