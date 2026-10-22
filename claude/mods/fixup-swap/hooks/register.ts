import type { Register, SessionMessage } from 'claude-code'

// Must match the fixup plugin's MARKER. /fixup hands the revision over through
// the compaction's instructions: the engine skips a plugin's own
// session.compact hook when that plugin started the compaction, so the swap
// lives in a plugin of its own.
const MARKER = '<fixup-replacement>\n'

function isCompletedReply(message: SessionMessage): boolean {
  return message.role === 'assistant' && message.text.trim() !== '' && message.toolUses.length === 0
}

// Answer /fixup's compaction ourselves: the conversation up to the last
// completed reply, with that reply swapped for the revision. Nothing is
// summarised, and everything before the reply is handed back as the engine's
// own messages so the prompt cache prefix is unchanged.
export const register: Register = on => {
  on('session.compact', { trigger: 'plugin' }, ($, e, next) => {
    if (!e.instructions?.startsWith(MARKER) || e.agentId !== undefined) return next(e)

    const index = e.messages.findLastIndex(isCompletedReply)
    if (index < 0) return { skip: 'no completed assistant message found' }

    const revised: SessionMessage = {
      role: 'assistant',
      text: e.instructions.slice(MARKER.length),
      toolUses: [],
    }

    return { messages: [...e.messages.slice(0, index), revised] }
  })
}
