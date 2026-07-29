import { defineConfig } from "vite";
import { docs } from "@notation/docs";

// All options shown are required, except `defaultSlug` (not shown).
// Schema: ~/Repos/docs/packages/docs/src/options.ts
export default defineConfig({
  plugins: [
    docs({
      title: "<project> – <tagline>",
      github: "https://github.com/<owner>/<repo>",
      favicon: { href: "/favicon-32x32.png", type: "image/svg+xml" },
      categories: ["manual"], // slugs, in top-nav order; must match index.ts
      contentDirectory: ".", // the site lives inside the content it publishes
      pagesDirectory: "pages",
      logo: "./views/logo.tsx",
      version: { packageJson: "package.json", dependency: "<main-package>" },
      deployment: {
        name: "<repo-name>-docs", // Cloudflare Worker name
        compatibilityDate: "2025-09-24",
        compatibilityFlags: ["nodejs_compat"],
      },
    }),
  ],
});
