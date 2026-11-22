# TMP — Typing Metrics Print

A website that reads your typing rhythm and prints a security readout: entropy, rhythm, human-likeness, and flags.

Type something on the page → the client captures keystrokes → the metrics engine computes statistics → a readout card prints the result. Nothing is stored.

## Run

```sh
npm install
npm run dev
```

Open http://localhost:3030

## Layout

```
app/page.tsx                  — hero, capture, readout, timeline
app/api/analyze/route.ts      — POST /api/analyze — validation + metrics + readout
components/CapturePanel.tsx   — typing area + Start / Analyze
components/ReadoutCard.tsx    — metrics breakdown + flags
components/TimelineChart.tsx  — SVG timeline of the intervals
components/PrivacyNote.tsx    — privacy note
hooks/useTypingCapture.ts     — keydown/keyup timing capture
lib/metrics.ts                — computeMetrics + generateReadout
lib/types.ts                  — TypingEvent, TypingMetrics
```

## Tests

```sh
npm test
```

## License

MIT
