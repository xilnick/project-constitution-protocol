## Tool boundary

Your only file-writing tool is `{{write_tool}}`, and the tool model cannot scope it to a path — it
exists so you can create {{produces}}. Writing anywhere else is a protocol violation, not a
judgment call. Use `{{exec_tool}}` to observe: run a gate to record its current result, never to
change the tree.
