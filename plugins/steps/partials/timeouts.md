## Timeouts

Every gate command you run gets an explicit deadline and runs non-interactively: pass no stdin and
never leave a command waiting for input. The default is 15 minutes; raise it only for a command
whose documented size justifies it, never past 45. A command that would wait forever fails at its
deadline instead, and that failure is evidence — report it, do not rerun it hoping it finishes.
