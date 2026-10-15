---
name: rex-protocol
description: "Message a Rex terminal pane. Use when the user gives a rex:// address."
---

A `rex://<block>@<session>` address names a Rex pane. To send a message to that pane, run `rex send -s <session> -b <block> 'one-line message' && rex send-key -s <session> -b <block> enter`. 

Your own address is `rex://$REX_BLOCK@$REX_SESSION`.
