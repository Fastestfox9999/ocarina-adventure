# Ocarina of Time · local edition

Double-click **Play Ocarina.command** on macOS. The launcher uses Python 3 and opens the game at http://127.0.0.1:18764/. Keep its Terminal window open while playing. The game assets are included. Chrome was used for testing.

Create or choose a file on the opening screen. With default bindings, X confirms, C goes back, WASD moves the selection and Space jumps to End when naming a file. Press M to pause. Select a page using its item icon, choose Game menu for the original engine settings, or press M to resume.

- **Controls** lets you assign a physical key to each action. Dialogue button prompts and menu legends follow those bindings. Under Mouse camera, choose Hold right-click, Move mouse freely, or Off. Free-look captures the mouse while you turn the camera. Press Tab to release the cursor, hover a top HUD button to see its current binding, or click it to use the action. Click the play area to capture the mouse again. Scroll up to bring the camera closer or down to pull it back in either mouse camera mode. The distance is remembered. Adjust mouse sensitivity from 0.25× to 3× and enable inverted vertical look if desired. During gameplay, switching tabs opens the pause menu by default. Return and press M to resume, or disable this behavior in Controls. Fixed-camera rooms and cutscenes control their own views.
- **Graphics** sets the game's interpolation target to 20, 30 or 60 FPS. Render at 50%, 75%, 100%, 150% or 200% of window dimensions after reopening. The graphics page also controls distant model detail, widescreen visibility, 3D drops, Kokiri visibility and Temple of Time medallion colors.
- **Saves** writes the active game file immediately and confirms browser persistence. Reopen the same file to continue. The recorded entrance and ordinary dungeon restart rules apply. The engine also autosaves about every three minutes during eligible gameplay. Use Save now before closing. Private browsing, clearing site data, switching browsers or changing the address affects access to saves. Existing saves on the upstream website belong to that site's browser storage.
- **Cheats** lets you search for infinite resources, movement cheats, equipment, songs, bottle contents, warps, enemies and challenges. Switches persist in this browser. Save after granting items to keep them. Download a backup from **Saves** before experimenting.
- **Quality of life** includes faster dialogue and warping from learned songs on the quest screen. Seven game fixes start enabled, including floor-switch alignment, Goron City doors and Deku Nut upgrade eligibility. Each can be changed individually.

For another operating system, run `python3 prepare.py` from the repository root, then serve the site folder with Python 3 using `python3 -m http.server 18764 --bind 127.0.0.1`, and open the address above. For static hosting, run `python3 prepare.py` first, then copy the contents of site to one directory and serve .wasm files as application/wasm.

## Source and scope

This local edition is based on [andrewnakas/oot-cleanroom](https://github.com/andrewnakas/oot-cleanroom) and its [published build](https://github.com/andrewnakas/oot-cleanroom/tree/4c2bf5c2ce7d7f95a2a41b17da96c51dc5e09cf5). See site/THIRD_PARTY.md for component credits. The editable menu and controls are in site/settings.js and site/settings.css. The web glue scales the canvas dimensions reported to SDL. The engine adapter adds camera delta inputs and exposes existing native save and settings functions. patch_engine.py reproduces the modified engine from the pinned upstream binary using Python 3.8 or newer.

Two fixed-view interior images in oot.o2r have revised furnishings and shop stock. Other views, including panorama walls, use the upstream artwork.

**Restore a backup** under M → Saves accepts an exported Ship of Harkinian .sav, lets you select a destination, and restarts at file select. Empty slots are selected first.

**Texture pack** under M → Graphics switches between OoT Reloaded and Classic clean-room after a reload. The local browser version uses resized assets from the SoH HD release to fit browser memory.

Press K or click Skip cutscene when the prompt appears. The launcher verifies and assembles the Reloaded archive from the three included parts. Personal save files and browser preferences live in your browser.
