function relationName(
  value: { category_name?: string } | { category_name?: string }[] | null
) {
  if (Array.isArray(value)) return value[0]?.category_name ?? null;
  return value?.category_name ?? null;
}

export { relationName };
