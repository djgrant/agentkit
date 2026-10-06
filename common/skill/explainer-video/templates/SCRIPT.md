---
title: Title of the source document
source: path/in/repo/to/source.md
source_label: RFC 0000
---

## 01 first-frame-slug

Narration for frame 1, as one paragraph.

```diagram
role --> policy attachment; the attachment fades on "replace"
```

## 02 second-frame-slug

Narration for frame 2. The voice says "the role name[^1]"; the frame shows the footnote text.

```ts
interface UpdateRoleInput {
  RoleName: string;
  Description?: string;
}
```

[^1]: prod-orders-api-role-7f3a
