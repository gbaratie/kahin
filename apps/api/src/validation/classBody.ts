import type {
  CreateClassInput,
  UpdateClassInput,
} from '@kahin/qcm-application';

export function validateCreateClassBody(body: unknown): CreateClassInput {
  const b = body as { name?: unknown; names?: unknown };
  const name = b?.name;
  if (name == null || String(name).trim() === '') {
    throw new Error('class name required');
  }
  const names = Array.isArray(b.names)
    ? b.names.map((n) => String(n ?? ''))
    : [];
  return { name: String(name), names };
}

export function validateUpdateClassBody(body: unknown): UpdateClassInput {
  const b = body as { name?: unknown; names?: unknown };
  const name = b?.name;
  if (name == null || String(name).trim() === '') {
    throw new Error('class name required');
  }
  if (!Array.isArray(b.names)) {
    throw new Error('names required');
  }
  return {
    name: String(name),
    names: b.names.map((n) => String(n ?? '')),
  };
}
