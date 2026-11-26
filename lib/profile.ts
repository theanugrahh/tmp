import { GAP_BIN_MS, GAP_BINS } from "./metrics";
import type { TypingMetrics } from "./types";

export const PROFILE_VERSION = 1;
export const SAMPLES_REQUIRED = 3;
export const MAX_PROFILE_NAME_LENGTH = 80;
export const MATCH_STRONG = 80;
export const MATCH_POSSIBLE = 60;

export const FEATURE_LABELS = {
	medianGapMs: "Rhythm",
	cv: "Variation",
	entropyBits: "Entropy",
	avgHoldMs: "Hold",
	backspaceRate: "Corrections",
	histogram: "Distribution",
} as const;

export type FeatureKey = keyof typeof FEATURE_LABELS;

export interface FeatureVector {
	medianGapMs: number;
	cv: number;
	entropyBits: number;
	avgHoldMs: number;
	backspaceRate: number;
	histogram: number[];
}

export interface FeatureStat {
	mean: number;
	spread: number;
}

export interface ProfileTemplate {
	medianGapMs: FeatureStat;
	cv: FeatureStat;
	entropyBits: FeatureStat;
	avgHoldMs: FeatureStat;
	backspaceRate: FeatureStat;
	histogram: number[];
}

export interface TypingProfile {
	version: number;
	id: string;
	name: string;
	sentence: string;
	createdAt: string;
	salt: string;
	samples: FeatureVector[];
	template: ProfileTemplate;
	checksum: string;
}

export interface FeatureDelta {
	key: FeatureKey;
	label: string;
	observed: number;
	expected: number;
	deviation: number;
	observedText: string;
	expectedText: string;
}

export interface Comparison {
	score: number;
	label: string;
	tone: "good" | "warn" | "neutral";
	explanation: string;
	deltas: FeatureDelta[];
	closeCount: number;
}

const FEATURE_KEYS: FeatureKey[] = [
	"medianGapMs",
	"cv",
	"entropyBits",
	"avgHoldMs",
	"backspaceRate",
	"histogram",
];

const WEIGHTS: Record<FeatureKey, number> = {
	medianGapMs: 0.2,
	cv: 0.2,
	entropyBits: 0.15,
	avgHoldMs: 0.15,
	backspaceRate: 0.1,
	histogram: 0.2,
};

const SPREAD_FLOORS: Record<Exclude<FeatureKey, "histogram">, number> = {
	medianGapMs: 25,
	cv: 0.06,
	entropyBits: 0.3,
	avgHoldMs: 20,
	backspaceRate: 0.04,
};

function round(value: number, digits: number): number {
	const factor = 10 ** digits;
	return Math.round(value * factor) / factor;
}

function average(values: number[]): number {
	if (values.length === 0) return 0;
	return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function spread(values: number[], floor: number): number {
	if (values.length < 2) return floor;
	const center = average(values);
	const variance =
		values.reduce((sum, value) => sum + (value - center) ** 2, 0) /
		values.length;
	return Math.max(Math.sqrt(variance), floor);
}

export function histogramFrom(gaps: number[]): number[] {
	const bins = new Array<number>(GAP_BINS).fill(0);
	for (const gap of gaps) {
		const raw = Math.floor(gap / GAP_BIN_MS);
		const index = Math.min(GAP_BINS - 1, Math.max(0, raw));
		bins[index] = (bins[index] ?? 0) + 1;
	}
	if (gaps.length === 0) return bins;
	return bins.map((count) => count / gaps.length);
}

export function featureVector(metrics: TypingMetrics): FeatureVector {
	return {
		medianGapMs: round(metrics.medianGapMs, 1),
		cv: round(metrics.cv, 4),
		entropyBits: round(metrics.entropyBits, 3),
		avgHoldMs: round(metrics.avgHoldMs, 1),
		backspaceRate: round(metrics.backspaceRate, 4),
		histogram: histogramFrom(metrics.gaps).map((value) => round(value, 5)),
	};
}

export function buildTemplate(samples: FeatureVector[]): ProfileTemplate {
	const first = samples[0];
	const histogram =
		first?.histogram.map((_, index) =>
			round(average(samples.map((sample) => sample.histogram[index] ?? 0)), 5),
		) ?? new Array<number>(GAP_BINS).fill(0);
	return {
		medianGapMs: {
			mean: average(samples.map((sample) => sample.medianGapMs)),
			spread: spread(
				samples.map((sample) => sample.medianGapMs),
				SPREAD_FLOORS.medianGapMs,
			),
		},
		cv: {
			mean: average(samples.map((sample) => sample.cv)),
			spread: spread(
				samples.map((sample) => sample.cv),
				SPREAD_FLOORS.cv,
			),
		},
		entropyBits: {
			mean: average(samples.map((sample) => sample.entropyBits)),
			spread: spread(
				samples.map((sample) => sample.entropyBits),
				SPREAD_FLOORS.entropyBits,
			),
		},
		avgHoldMs: {
			mean: average(samples.map((sample) => sample.avgHoldMs)),
			spread: spread(
				samples.map((sample) => sample.avgHoldMs),
				SPREAD_FLOORS.avgHoldMs,
			),
		},
		backspaceRate: {
			mean: average(samples.map((sample) => sample.backspaceRate)),
			spread: spread(
				samples.map((sample) => sample.backspaceRate),
				SPREAD_FLOORS.backspaceRate,
			),
		},
		histogram,
	};
}

function checksumInput(profile: {
	version: number;
	id: string;
	name: string;
	sentence: string;
	createdAt: string;
	salt: string;
	samples: FeatureVector[];
	template: ProfileTemplate;
}): string {
	return JSON.stringify([
		profile.version,
		profile.id,
		profile.name,
		profile.sentence,
		profile.createdAt,
		profile.salt,
		profile.samples,
		profile.template,
	]);
}

export function checksumFor(profile: {
	version: number;
	id: string;
	name: string;
	sentence: string;
	createdAt: string;
	salt: string;
	samples: FeatureVector[];
	template: ProfileTemplate;
}): string {
	const text = checksumInput(profile);
	let hash = 0x811c9dc5;
	for (let index = 0; index < text.length; index += 1) {
		hash ^= text.charCodeAt(index);
		hash = Math.imul(hash, 0x01000193) >>> 0;
	}
	return hash.toString(16).padStart(8, "0");
}

export function createProfile(input: {
	name: string;
	sentence: string;
	samples: FeatureVector[];
	id?: string;
	createdAt?: string;
	salt?: string;
}): TypingProfile {
	if (input.samples.length === 0) {
		throw new Error("At least one sample is needed to create a profile.");
	}
	const name = input.name.trim() || "Untitled profile";
	if (name.length > MAX_PROFILE_NAME_LENGTH) {
		throw new Error(
			`Invalid profile: name must be ${MAX_PROFILE_NAME_LENGTH} characters or fewer.`,
		);
	}
	const base = {
		version: PROFILE_VERSION,
		id: input.id ?? crypto.randomUUID(),
		name,
		sentence: input.sentence,
		createdAt: input.createdAt ?? new Date().toISOString(),
		salt: input.salt ?? crypto.randomUUID(),
		samples: input.samples,
		template: buildTemplate(input.samples),
	};
	return { ...base, checksum: checksumFor(base) };
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function requireNumber(value: unknown, label: string): number {
	if (typeof value !== "number" || !Number.isFinite(value)) {
		throw new Error(`Invalid profile: ${label} must be a number.`);
	}
	return value;
}

function requirePositiveNumber(value: unknown, label: string): number {
	const number = requireNumber(value, label);
	if (number <= 0) {
		throw new Error(`Invalid profile: ${label} must be greater than zero.`);
	}
	return number;
}

function parseHistogram(value: unknown, label: string): number[] {
	if (!Array.isArray(value) || value.length !== GAP_BINS) {
		throw new Error(`Invalid profile: bad ${label} distribution.`);
	}
	return value.map((bin) => requireNumber(bin, `${label} distribution bin`));
}

function requireString(value: unknown, label: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`Invalid profile: ${label} is missing.`);
	}
	return value;
}

function requireBoundedString(
	value: unknown,
	label: string,
	maxLength: number,
): string {
	const text = requireString(value, label);
	if (text.length > maxLength) {
		throw new Error(
			`Invalid profile: ${label} must be ${maxLength} characters or fewer.`,
		);
	}
	return text;
}

function parseFeatureVector(value: unknown): FeatureVector {
	if (!isRecord(value)) throw new Error("Invalid profile: bad sample.");
	return {
		medianGapMs: requireNumber(value.medianGapMs, "sample rhythm"),
		cv: requireNumber(value.cv, "sample variation"),
		entropyBits: requireNumber(value.entropyBits, "sample entropy"),
		avgHoldMs: requireNumber(value.avgHoldMs, "sample hold"),
		backspaceRate: requireNumber(value.backspaceRate, "sample corrections"),
		histogram: parseHistogram(value.histogram, "sample"),
	};
}

function parseStat(value: unknown, label: string): FeatureStat {
	if (!isRecord(value)) throw new Error(`Invalid profile: bad ${label}.`);
	return {
		mean: requireNumber(value.mean, `${label} mean`),
		spread: requirePositiveNumber(value.spread, `${label} spread`),
	};
}

function parseTemplate(value: unknown): ProfileTemplate {
	if (!isRecord(value)) throw new Error("Invalid profile: bad template.");
	return {
		medianGapMs: parseStat(value.medianGapMs, "rhythm"),
		cv: parseStat(value.cv, "variation"),
		entropyBits: parseStat(value.entropyBits, "entropy"),
		avgHoldMs: parseStat(value.avgHoldMs, "hold"),
		backspaceRate: parseStat(value.backspaceRate, "corrections"),
		histogram: parseHistogram(value.histogram, "template"),
	};
}

export function parseProfile(raw: unknown): TypingProfile {
	if (!isRecord(raw)) throw new Error("Invalid profile file.");
	if (raw.version !== PROFILE_VERSION) {
		throw new Error("Unsupported profile version.");
	}
	const profile: TypingProfile = {
		version: PROFILE_VERSION,
		id: requireString(raw.id, "id"),
		name: requireBoundedString(raw.name, "name", MAX_PROFILE_NAME_LENGTH),
		sentence: requireString(raw.sentence, "sentence"),
		createdAt: requireString(raw.createdAt, "createdAt"),
		salt: requireString(raw.salt, "salt"),
		samples: [],
		template: parseTemplate(raw.template),
		checksum: requireString(raw.checksum, "checksum"),
	};
	if (!Array.isArray(raw.samples) || raw.samples.length === 0) {
		throw new Error("Invalid profile: no samples.");
	}
	profile.samples = raw.samples.map(parseFeatureVector);
	if (checksumFor(profile) !== profile.checksum) {
		throw new Error("Profile checksum does not match — the file was changed.");
	}
	return profile;
}

function featureText(key: FeatureKey, value: number): string {
	switch (key) {
		case "medianGapMs":
		case "avgHoldMs":
			return `${Math.round(value)} ms`;
		case "cv":
			return value.toFixed(2);
		case "entropyBits":
			return `${value.toFixed(1)} bits`;
		case "backspaceRate":
			return `${Math.round(value * 100)}%`;
		case "histogram":
			return `${Math.round(value * 100)}%`;
	}
}

function histogramDistance(observed: number[], expected: number[]): number {
	let total = 0;
	for (let index = 0; index < GAP_BINS; index += 1) {
		total += Math.abs((observed[index] ?? 0) - (expected[index] ?? 0));
	}
	return Math.min(total / 2, 1);
}

function scalarDeviation(observed: number, expected: number, spread: number) {
	return Math.min(Math.abs(observed - expected) / (spread * 2), 1);
}

export function compareToProfile(
	metrics: TypingMetrics,
	profile: TypingProfile,
): Comparison {
	const observed = featureVector(metrics);
	const deltas: FeatureDelta[] = FEATURE_KEYS.map((key) => {
		if (key === "histogram") {
			const deviation = histogramDistance(
				observed.histogram,
				profile.template.histogram,
			);
			return {
				key,
				label: FEATURE_LABELS[key],
				observed: deviation,
				expected: 0,
				deviation,
				observedText: `${Math.round(deviation * 100)}% apart`,
				expectedText: "baseline",
			};
		}
		const expected = profile.template[key].mean;
		const isHold = key === "avgHoldMs";
		const deviation =
			isHold && observed.avgHoldMs === 0
				? 0
				: scalarDeviation(
						observed[key],
						expected,
						profile.template[key].spread,
					);
		return {
			key,
			label: FEATURE_LABELS[key],
			observed: observed[key],
			expected,
			deviation,
			observedText: featureText(key, observed[key]),
			expectedText: featureText(key, expected),
		};
	});

	const totalWeight = FEATURE_KEYS.reduce((sum, key) => sum + WEIGHTS[key], 0);
	const weightedScore = FEATURE_KEYS.reduce((sum, key, index) => {
		const delta = deltas[index];
		return sum + WEIGHTS[key] * (1 - (delta?.deviation ?? 1));
	}, 0);
	const score = Math.round((weightedScore / totalWeight) * 100);
	const closeCount = deltas.filter((delta) => delta.deviation <= 0.35).length;

	if (profile.samples.length < SAMPLES_REQUIRED) {
		return {
			score,
			label: "Not enough data",
			tone: "neutral",
			explanation: `Enroll with ${SAMPLES_REQUIRED} samples before verifying. This profile has ${profile.samples.length}.`,
			deltas,
			closeCount,
		};
	}
	if (score >= MATCH_STRONG) {
		return {
			score,
			label: "Strong match",
			tone: "good",
			explanation: `${closeCount} of ${deltas.length} signals sit close to your saved profile.`,
			deltas,
			closeCount,
		};
	}
	if (score >= MATCH_POSSIBLE) {
		return {
			score,
			label: "Possible match",
			tone: "warn",
			explanation: `${closeCount} of ${deltas.length} signals sit close to your saved profile. Try again on the same keyboard.`,
			deltas,
			closeCount,
		};
	}
	return {
		score,
		label: "No match",
		tone: "neutral",
		explanation: `Only ${closeCount} of ${deltas.length} signals sit close to your saved profile. This is a demo signal, not authentication.`,
		deltas,
		closeCount,
	};
}
