#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# If tty is available, apply fix from https://github.com/typicode/husky/issues/968#issuecomment-1176848345
if sh -c ": >/dev/tty" >/dev/null 2>/dev/null; then exec >/dev/tty 2>&1; fi

# Heavy checks should only be done on staged files
yarn lint-staged
