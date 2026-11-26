# TMP — Typing Metrics Print

A motion-free web workspace that reads typing rhythm, saves local fingerprint profiles, and compares a new sample with a saved profile.

TMP has three modes:

- **Analyze** — capture once and print a readable rhythm report.
- **Enroll** — type the same sentence three times and save a local profile template.
- **Verify** — type again and compare the new sample with a saved profile.

Profiles live in this browser's `localStorage` unless you export or import the JSON file. This is a demo signal, not authentication; real security should use WebAuthn/passkeys or TOTP.

The page opens with an explicit data-use choice. Capture, enrollment, verification, and exports stay hidden until you allow data use; choosing **No thanks** keeps them paused. You can withdraw or change consent at any time with **Privacy choices** in the footer. Withdrawal asks for confirmation and deletes the profiles stored in this browser. See `/privacy` for the data notice and `/terms` for baseline usage terms.

After consent, the page opens with a single **Start capture** button. The typing area appears only after you press it, **Analyze** stops the capture on its own, the captured text stays visible as a read-only transcript, and **Start over** begins a fresh run.

The type system uses local bold sans fonts only: Plus Jakarta Sans for display, headings, buttons, and accents; Manrope for prose and UI; JetBrains Mono for numbers and machine-readable values. Fonts are served by the app from `public/fonts/`; no fonts are fetched at runtime. There are no animations, CSS transitions, or canvas elements.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3030

## Metrics

The engine in `lib/metrics.ts` is the single source of truth: the readout, verdict, flags, and explanations are all derived from one `computeMetrics` call.

| Signal              | Definition                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Tracked key presses | `down` events that are not modifiers and not auto-repeat                                                                        |
| Gaps                | Differences between consecutive tracked `down` timestamps; `<= 0` dropped, `> 1200 ms` counted as a thinking pause and excluded |
| Entropy             | Shannon entropy in bits over fixed 25 ms bins from 0 to 1200 ms                                                                 |
| Rhythm              | Median gap, in ms                                                                                                               |
| Human-likeness      | `5 × min(CV ÷ 0.45, 1)`, with a deterministic bootstrap 95% CI (1000 resamples)                                                 |
| Average hold        | Mean `down`→`up` duration per key, repeats ignored, 0–2000 ms kept                                                              |
| Backspace rate      | Backspace/Delete `down` events ÷ tracked key presses                                                                            |

A verdict is only issued once at least 10 gaps exist. The verdict uses the 95% CI of the score: entirely at or above 3.5 is human-like, entirely at or below 1.5 is machine-like, otherwise mixed. Flags follow the same verdict, plus `high-edit-rate` when more than 15% of at least 20 tracked presses are corrections.

`POST /api/analyze` accepts `{ events: AnalyzeEvent[] }` and returns `{ metrics, readout }`. Each event carries an opaque `keyId`, event type, timestamp, and modifier/correction flags; raw key names are replaced in the browser before the request. It responds `400` for malformed or raw-key input or timestamps spanning more than 10 minutes, `413` above 1000 events, and `422` for non-monotonic timestamps or fewer than two non-modifier presses.

Rate limiting is intentionally handled at the platform/WAF layer, not in application code. Deployments should configure a host/WAF rule that limits `POST /api/analyze` by client IP and/or authenticated identity, with limits tuned to the deployment. This repo does not add Redis/Upstash or per-process in-memory counters.

## Profiles

`lib/profile.ts` builds a versioned profile from three feature vectors: median gap, coefficient of variation, entropy, average hold, backspace rate, and a 48-bin gap histogram. Each profile includes a checksum; malformed, tampered, or unsupported files are rejected on import.

The local vault stores profiles under `tmp.profiles.v1`; consent is stored separately under `tmp.consent.v1`. Writes fail loudly: if the browser cannot persist a profile change, the UI shows an error instead of claiming the profile was saved.

You can:

- name a profile during enrollment,
- download the finished profile JSON from the post-Enroll card,
- select a profile for verification,
- export a `.tmp-profile.json` file,
- import a compatible profile file,
- delete a profile,
- export the raw keystrokes and readout as a session JSON file.

## Layout

```
app/page.tsx                  — hero, consent gate, workspace modes, capture, vault, readout, guide
app/privacy/page.tsx          — plain-language data-use notice
app/terms/page.tsx            — baseline usage terms
app/icon.svg                  — TMP monogram favicon
app/api/analyze/route.ts      — POST /api/analyze — validation + metrics + readout
app/globals.css               — bold sans tokens, local fonts, utility classes
next.config.ts                — disables the Next dev indicator
components/SiteHeader.tsx     — wordmark + nav
components/ModeSwitch.tsx     — Analyze / Enroll / Verify tabs
components/SentencePicker.tsx — preset or custom practice sentence
components/CapturePanel.tsx   — Start → typing area → Analyze (stops capture) → transcript
components/ProfileLibrary.tsx — local profile vault, import/export/delete/use
components/ComparisonCard.tsx — profile match score, signals, and gap distribution
components/ReadoutCard.tsx    — verdict chip, rule-separated stats, flags
components/TimelineChart.tsx  — SVG timeline of the gaps
components/MetricGuide.tsx    — plain-language guide to the five signals
components/ConsentNotice.tsx  — explicit allow/decline/review choice
components/PrivacyNote.tsx    — legal links and persistent Privacy choices control
hooks/useTypingCapture.ts     — keydown/keyup timing capture
lib/analyzeEvents.ts          — raw TypingEvent → opaque AnalyzeEvent payload
lib/consentStorage.ts         — local consent choice, policy version, fail-closed writes
lib/keys.ts                   — shared modifier-key set
lib/metrics.ts                — computeMetrics + generateReadout
lib/profile.ts                — profile template, checksum, and comparison
lib/profileStorage.ts         — local vault, import/export, persistence errors
lib/sentences.ts              — preset practice sentences
lib/session.ts                — session JSON export
lib/types.ts                  — TypingEvent, TypingMetrics, Verdict
```

## Tests

```sh
npm test
npx tsc --noEmit
npm run lint
npm run build
```

## License

MIT. See [LICENSE](./LICENSE). Bundled fonts are licensed under the SIL Open Font License 1.1; see [public/fonts/OFL.txt](./public/fonts/OFL.txt).
