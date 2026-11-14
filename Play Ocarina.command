#!/bin/zsh
python3 "${0:A:h}/prepare.py" || exit 1
cd -- "${0:A:h}/site" || exit 1
url='http://127.0.0.1:18764/'
if curl -fsS "${url}settings.js" 2>/dev/null | grep -q 'ocarina.adventure.settings.v1'; then
  open -a "Google Chrome" "${url}?update=controls10" || open "${url}?update=controls10"
  exit
fi
python3 -m http.server 18764 --bind 127.0.0.1 &
game_server=$!
trap 'kill "$game_server" 2>/dev/null' EXIT
for attempt in {1..50}; do
  if ! kill -0 "$game_server" 2>/dev/null; then
    echo 'The local game could not start. Check the message above.'
    exit 1
  fi
  if curl -fsS "${url}settings.js" 2>/dev/null | grep -q 'ocarina.adventure.settings.v1'; then
    open -a "Google Chrome" "${url}?update=controls10" || open "${url}?update=controls10"
    echo 'Keep this window open while playing. Press Control-C to stop the game server.'
    wait "$game_server"
    exit
  fi
  sleep .1
done
echo 'The game server did not start in time.'
