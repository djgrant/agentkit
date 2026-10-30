---
name: publishing-rfcs
description: Publish an RFC from a repo's rfcs/ folder as a GitHub issue, with its explainer video from .explainers/rfcs/ embedded under the Abstract. Use when asked to publish an RFC or create an issue for one.
---

# Publishing RFCs

From the root of the repo that holds `rfcs/` and `.explainers/rfcs/`, run:

```sh
sh "$(ak where skill publishing-rfcs)/scripts/publish-rfc.sh" <rfc-number> <owner/repo> <video>
```

`<owner/repo>` is the GitHub repo of the `origin` remote. `<video>` is the explainer to embed, usually `.explainers/rfcs/<rfc-file-name>.mp4`. If several videos match the RFC, ask the user which one to use.

The issue looks like https://github.com/notationlabs/yieldstar/issues/44:

1. The title is `RFC <number>: <title>`. The number keeps the padding of the RFC's file name.
2. The body opens with `## Abstract`. If the RFC's intro has no heading, the script adds one. It drops the frontmatter, the H1 and leading `**Status:**`-style metadata lines.
3. The video URL follows the abstract, then the transcript in a collapsed `<details>` block, then the rest of the RFC.

The script compresses the video under GitHub's 10 MB limit, uploads it with the `github/issue-attachment` lens and prints the issue URL. If an issue titled `RFC <number>:` already exists, the script rewrites that issue's title and body instead of creating a new one. To repair an issue whose upload failed, run the script again.

If the lens reports that Chrome remote debugging is not responding, restart the lens broker with `lens broker shutdown && lens broker acquire`, then run the script again. If the lens reports `needs_auth`, ask the user to sign in to GitHub in their browser, then run the script again.
