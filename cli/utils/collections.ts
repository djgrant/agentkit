type Obj = Record<string, unknown>;

export const object = {
  /** Drop undefined fields. */
  compact: (obj: Obj) => Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined)),

  pick: (obj: Obj, keys: string[]) => Object.fromEntries(Object.entries(obj).filter(([key]) => keys.includes(key))),

  omit: (obj: Obj, keys: string[]) => Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key))),

  /** Keys whose values differ between before and after, as "+/-/~ key" lines. */
  diff: (before: Obj, after: Obj) =>
    array
      .unique([...Object.keys(before), ...Object.keys(after)])
      .filter((key) => !Bun.deepEquals(before[key], after[key]))
      .map((key) => `${!(key in before) ? "+" : !(key in after) ? "-" : "~"} ${key}`),
};

export const array = {
  unique: <T>(items: T[]) => [...new Set(items)],

  /** Bucket items by a string key, preserving encounter order. */
  groupBy<T>(items: T[], key: (item: T) => string) {
    const groups = new Map<string, T[]>();
    for (const item of items) {
      const k = key(item);
      const bucket = groups.get(k);
      if (bucket) bucket.push(item);
      else groups.set(k, [item]);
    }
    return groups;
  },
};
