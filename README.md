# Pokemon: Kanto Mini Quest

A self-contained retro Game Boy Advance pixel-art Pokemon mini web game built with HTML5 Canvas, CSS variables, and a zero-dependency Web Audio API 8-bit chiptune synthesizer.

## Project Structure

- `index.html` - Main entry point (open directly in any modern browser or serve with a static server)
- `styles.css` - Responsive GBA console frame, Trainer HUD, light/dark theme variables, and print rules
- `game.js` - Complete game engine: 8-bit audio synth, 16x16 pixel-art sprite matrices, overworld maps, turn-based battle system, capture mechanics, evolutions, and local save persistence
- `standalone/Pokemon Mini Adventure.html` - Single-file portable bundle with inline CSS and JavaScript

## How to Play

1. Double-click `index.html` (or `standalone/Pokemon Mini Adventure.html`) to launch in your browser.
2. Choose your starter (`Bulbasaur`, `Charmander`, `Squirtle`, or `Pikachu`).
3. Move and navigate menus with `WASD` or `Arrow Keys` (or click/tap the on-screen GBA D-Pad).
4. Press `Z`, `Enter`, or `Space` (`A` button) to confirm, talk to NPCs, or read signs.
5. Press `X` or `Esc` (`B` button) to cancel/go back, and `M` (`START` button) to open the pause menu.
