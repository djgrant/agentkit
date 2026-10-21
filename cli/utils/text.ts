export const text = {
  plural: (count: number, word: string) => (count === 1 ? word : `${word}s`),
  /** "a", "a and b", "a and b and c" — how sync names the harnesses sharing a decision. */
  and: (items: string[]) => items.join(" and "),
};

export const md = {
  code: (s: string) => `\`${s}\``,
  table: (headers: string[], rows: string[][]) =>
    [headers, headers.map(() => "---"), ...rows].map((cells) => `| ${cells.join(" | ")} |`).join("\n"),
};
