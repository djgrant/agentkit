-- Copy the focused pane's address (rex://<block>@<session>) to the clipboard.
-- Lua can't touch the clipboard, so run pbcopy in a detached, self-closing block.
rex.action({
  name = "copy_block_address",
  title = "Copy Pane Address",
  run = function(ctx)
    local addr = "rex://" .. ctx.block_id .. "@" .. ctx.session_id
    rex.call("session.new_block", {
      session_id = ctx.session_id,
      flavor = "com.superlogical.terminal.shell",
      options = { command = { "/bin/sh", "-c", 'printf %s "$1" | pbcopy', "sh", addr } },
    })
    return addr
  end,
})

rex.bind("cmd+shift+i", "copy_block_address")
