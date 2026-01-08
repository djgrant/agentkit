# /init-agentkit

Install global dependencies for agentkit tools.

## Instructions

You are installing dependencies required by agentkit tools. Follow these steps:

### 1. Check Current State

Check the following:

- Python/pip availability: `which python3 && which pip3`
- Playwright package: `pip3 show playwright 2>/dev/null`
- Chromium for Playwright: `python3 -c "from playwright.sync_api import sync_playwright; print('installed')" 2>/dev/null`
- files-to-prompt package: `pip3 show files-to-prompt 2>/dev/null`

### 2. Propose a Plan

Present your findings to the user in a clear summary:

```
## Current State

Dependencies:
- Python/pip: [available | not found]
- playwright: [installed | not installed]
- playwright chromium: [installed | not installed]
- files-to-prompt: [installed | not installed]

## Proposed Actions

1. [List what will be installed]
```

Then ask: "Proceed with installation? (y/n)"

Wait for user confirmation before proceeding.

### 3. Execute the Plan

After user confirms:

**Install missing dependencies (if pip available):**

IF playwright not installed:
```bash
pip3 install playwright
```

IF playwright chromium not installed:
```bash
playwright install chromium
```

IF files-to-prompt not installed:
```bash
pip3 install files-to-prompt
```

If pip is not available, inform the user:
> Python/pip not found. Please install Python 3 and pip, then run:
> - `pip3 install playwright && playwright install chromium`
> - `pip3 install files-to-prompt`

### 4. Report Results

Summarize what was done:

```
## Installation Complete

Installed:
- [List installed packages]

Skipped:
- [List anything already installed]
```
