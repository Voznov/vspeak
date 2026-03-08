export const filterValues = <Key extends string | number | symbol, InValue, OutValue extends InValue>(
  obj: Record<Key, InValue>,
  predicate: (value: InValue, key: Key) => value is OutValue,
): Record<Key, OutValue> => Object.fromEntries(Object.entries<InValue>(obj).filter(([key, value]) => predicate(value, key as Key))) as Record<Key, OutValue>;
