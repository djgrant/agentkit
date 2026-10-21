/** An owned entry and how its live destination compares to the repo source. */
export interface LinkState {
  harness: string;
  format: string;
  entry: string;
  src: string; // repo source the dest should point at
  dest: string; // live path in the harness
  status: "ok" | "missing" | "stale" | "blocked";
  liveTarget?: string; // present when status === "stale"
}

/** A live real dir on an unowned name — a self-installed skill we could adopt. */
export interface Unmanaged {
  harness: string;
  format: string;
  entry: string;
  dest: string;
}

/** common/unmanaged.json `links`: harness -> format -> entries sync leaves alone. */
export type UnmanagedLinks = Record<string, Record<string, string[]>>;
