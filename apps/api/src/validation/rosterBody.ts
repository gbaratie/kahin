import type { UpdateStudentRosterInput } from '@kahin/qcm-application';

export function validateRosterBody(body: unknown): UpdateStudentRosterInput {
  const names = (body as { names?: unknown })?.names;
  if (!Array.isArray(names)) {
    throw new Error('names required');
  }
  return {
    names: names.map((n) => String(n ?? '')),
  };
}
