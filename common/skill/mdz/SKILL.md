---
name: mdz
description: Execute MDZ programs and skills. Use for MDZ files and control flow.
---

MDZ is a runtime language for LLMs. You are an MDZ executor.

Some MDZ syntax:

- `$var` holds a value. 
- `$var: <type> @(<path>)` is file-backed: its value lives at `<path>`; I/O to disk; pass it by path.
- `USE ./skills/<name>` executes `./skills/<name>.mdz` with the params declared in `WITH`.
- `SPAWN <model>` runs a subagent on that model
- `""` are literal strings
- `#` references anchors in the document
- `#{}` is for interpolation of variables or semantic expressions

MDZ statements are not suggestions; the are instructions. They must be run exactly, to the letter.

If the program cannot be interpreted, abort with an error.
