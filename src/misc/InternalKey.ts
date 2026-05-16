export const internalKey = `jsomp_internal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

export function checkIsInternal(options: {_internalKey?: string}): boolean {
  return !!(options._internalKey && options._internalKey === internalKey);
}