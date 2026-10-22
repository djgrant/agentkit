import type { EngineInterface, Register } from 'claude-code'

// Must match fixup-swap's MARKER. The revision travels to fixup-swap in the
// compaction's instructions: the engine skips this plugin's own session.compact
// hook for a compaction it started, so another plugin has to answer it.
const MARKER = '<fixup-replacement>\n'

// The revision waiting to be swapped in, from /fixup until its compaction has run.
let replacement: string | undefined

function makeRevisionRequest(instructions: string): string {
  return `Rewrite your previous response according to these instructions:\n\n${instructions}\n\nReturn only the complete replacement response. Do not discuss the revision or add a preamble.`
}

// Compaction is refused from inside command.run (the command holds a turn),
// so it runs on a timer once the command has returned.
function swapIn($: EngineInterface, attempt = 0): void {
  $.clock.after(attempt === 0 ? 0 : 250, async () => {
    try {
      const compacted = await $.session.compact({ instructions: MARKER + replacement })
      $.ui.toast(compacted.skip === undefined ? 'Replaced the last assistant message' : `fixup: ${compacted.skip}`)
    } catch (error) {
      if (attempt < 20) return swapIn($, attempt + 1)
      $.ui.toast(`fixup failed: ${error instanceof Error ? error.message : String(error)}`)
    }
    replacement = undefined
  })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'fixup',
      description: 'Rewrite the last assistant reply in place',
      argumentHint: '<instructions>',
    })

    return next(e)
  })

  on('command.run', { command: 'fixup' }, async ($, e) => {
    const instructions = e.args.trim()
    if (!instructions) return { text: 'Usage: /fixup <instructions>' }
    if (replacement !== undefined) return { text: 'A fixup is already in progress' }

    // A fork sees the whole conversation, original reply included, from the
    // prompt cache, and leaves nothing behind in the transcript.
    $.ui.status('fixup: rewriting…')
    const revision = await $.model.fork({ prompt: makeRevisionRequest(instructions) })
    $.ui.status(undefined)
    if (!revision.isAnswered) {
      return revision.reason === 'nothing-to-fork'
        ? { text: 'Nothing to revise yet: after a resume or /clear, send a message first' }
        : { text: `No revision (${revision.reason})` }
    }

    replacement = revision.text.trim()
    swapIn($)

    return {}
  })
}
