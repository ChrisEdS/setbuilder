# Third-party notices

## essentia.js (AGPL-3.0)

SETBUILDER uses [essentia.js](https://github.com/MTG/essentia.js) client-side to estimate Energy Level (1–10) from stick audio files (“Energie aus Dateien”). The AGPL-3.0 license of essentia.js applies to that analysis code path when the app is distributed.

- Analysis runs only in the browser (Web Worker); audio is not uploaded.
- Source: [`src/lib/openkey/`](src/lib/openkey/) (ported from Openkey).
- License text: see `node_modules/essentia.js` / the [Essentia project](https://essentia.upf.edu/).

SETBUILDER itself remains MIT (see [LICENSE](LICENSE)). Key and BPM from rekordbox are not overwritten by this integration.
