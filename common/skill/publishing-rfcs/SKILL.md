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

The script creates the issue from the RFC (minus frontmatter and title), compresses the video under GitHub's 10 MB limit, uploads it with the `github/issue-attachment` lens, and inserts it after the Abstract. It prints the issue URL. It refuses if an issue titled `RFC <number>:` already exists.

If the lens reports `needs_auth`, ask the user to sign in to GitHub in their browser, then upload the compressed video the script printed with `lens call github/issue-attachment --catalog ~/Repos/operations/lenses-catalog/github --allow-writes --params '{"owner":…,"repo":…,"issue":…,"path":…}'` and add the returned `url` to the issue body by hand; don't re-run the script, which would refuse because the issue exists.
