export interface SentencePreset {
	id: string;
	label: string;
	text: string;
}

export const SENTENCE_PRESETS: SentencePreset[] = [
	{
		id: "fox",
		label: "Classic",
		text: "The quick brown fox jumps over the lazy dog.",
	},
	{
		id: "rhythm",
		label: "Rhythm",
		text: "I type in a rhythm that only my hands know.",
	},
	{
		id: "hands",
		label: "Hands",
		text: "Five fingers keep a steady beat across the keys.",
	},
];

export const DEFAULT_SENTENCE = SENTENCE_PRESETS[0]?.text ?? "";
