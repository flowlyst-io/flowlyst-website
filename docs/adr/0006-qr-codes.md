# 0006. QR codes

- **Status**: Accepted
- **Date**: 2026-10-30

## Context

Aziz asked for QR codes for links and contact cards, generated in the admin with one click, in the rainfall style with the flowlyst logo (issue #146, 2026-10-30; Tural present). The style is the `bars` look from the QR skill: rounded eyes, rounded alignment markers, vertical rounded bars, the logo in a white centre circle, error correction H. Drawing it needs the QR module matrix. Proving that each code scans needs a decoder in tests. Both are new libraries, so they pass the technology gate with his word.

## Decision

- **`qrcode` at runtime, for the matrix only.** `QRCode.create(text, { errorCorrectionLevel: 'H' })` gives the modules and the version; our own code draws the SVG (`src/utilities/qr/rainfallQr.ts`). Nothing else from the package is used. It has no bundled types and we add no `@types/qrcode`: `src/types/qrcode.d.ts` declares the one function used.
- **`jsqr` in devDependencies, tests only.** Every generated code is rasterised and decoded back to the exact input string.
- **The logo path is shared.** `src/utilities/flowlystMarkShared.ts` holds the mark path so the SVG and `Mark.tsx` use one copy.
- **Rendering happens in the browser** of the admin. There is no server QR endpoint.

## Consequences

- No Python and no network call at runtime; the builder is a pure function that runs in the admin and in tests.
- Decoding with `jsqr` is our evidence that a code scans. It is not a phone: real phone scanning is unverified here.
- If `jsqr` cannot read a code at the default bar width, the bar width steps up the skill's own ladder (0.72, 0.80, 0.88); the geometry is otherwise fixed.

## Alternatives considered

| Option                                    | Buys                                            | Costs                                                                 |
| ----------------------------------------- | ----------------------------------------------- | --------------------------------------------------------------------- |
| `qrcode` matrix plus our own SVG (chosen) | The exact rainfall geometry, small, client-safe | We own the drawing code and its tests                                 |
| `qr-code-styling`                         | Ready-made dot styles and a logo option         | Canvas/DOM based, not the rainfall geometry, heavier                  |
| Calling the Python skill                  | The reference implementation itself             | No Python on Vercel, so it cannot run in the deployed admin           |
| A hosted QR API                           | No code to write                                | A third-party service, no control over the logo, links leave the site |
| `jsqr` (tests only, chosen for decoding)  | A pure-JS decoder that proves a code scans      | A dev dependency; not a phone                                         |
