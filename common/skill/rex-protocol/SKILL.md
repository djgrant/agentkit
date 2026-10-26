---
name: rex-protocol
description: "Message a Rex terminal pane. Use when the user gives a rex:// address."
---

A `rex://<block>@<session>` address names a Rex pane. To send a message to that pane, wrap it in bracketed-paste markers and then press enter:

```sh
printf '\e[200~%s\e[201~' 'one-line message' | rex send -s <session> -b <block> && rex send-key -s <session> -b <block> enter
```

The markers matter: `rex send` types raw bytes, and without them a long message arrives in an agent's prompt with only its last few hundred characters. Always pass `-s`, `-b` and `enter` to `rex send-key`.

Your own address is `rex://$REX_BLOCK@$REX_SESSION`. Include it as a reply address only when you need to act on the response.
