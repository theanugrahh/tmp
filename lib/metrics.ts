import {
	eventKeyId,
	isCorrectionEvent,
	isModifierEvent,
} from "./analyzeEvents";
import type {
	AnalyzeEvent,
	MetricExplanation,
	TypingEvent,
	TypingMetrics,
	Verdict,
} from "./types";

export const MIN_GAPS = 10;
export const MAX_GAP_MS = 1200;
export const GAP_BIN_MS = 25;
export const GAP_BINS = Math.ceil(MAX_GAP_MS / GAP_BIN_MS);
export const MAX_HOLD_MS = 2000;
export const CV_ANCHOR = 0.45;
export const SCORE_SCALE = 5;
export const MACHINE_SCORE = 1.5;
export const HUMAN_SCORE = 3.5;
export const HIGH_EDIT_RATE = 0.15;
export const MIN_KEYS_FOR_EDIT_FLAG = 20;
export const BOOTSTRAP_RESAMPLES = 1000;

type EventRecord = TypingEvent | AnalyzeEvent;

function mean(values: number[]): number {
	if (values.length === 0) return 0;
	let total = 0;
	for (const value of values) total += value;
	return total / values.length;
}

function median(values: number[]): number {
	if (values.length === 0) return 0;
	const sorted = [...values].sort((a, b) => a - b);
	const middle = Math.floor(sorted.length / 2);
	if (sorted.length % 2 === 0) {
		const left = sorted[middle - 1] ?? 0;
		const right = sorted[middle] ?? 0;
		return (left + right) / 2;
	}
	return sorted[middle] ?? 0;
}

export function coefficientOfVariation(values: number[]): number {
	if (values.length < 2) return 0;
	const average = mean(values);
	if (average <= 0) return 0;
	let variance = 0;
	for (const value of values) variance += (value - average) ** 2;
	variance /= values.length;
	return Math.sqrt(variance) / average;
}

function seededRandom(seed: number): () => number {
	let state = seed >>> 0;
	return () => {
		state = (state * 1664525 + 1013904223) >>> 0;
		return state / 4294967296;
	};
}

export function bootstrapCvCi(
	values: number[],
	resamples: number = BOOTSTRAP_RESAMPLES,
): [number, number] {
	if (values.length < 2) return [0, 0];
	const random = seededRandom(0x5eed1e);
	const samples: number[] = [];
	for (let run = 0; run < resamples; run += 1) {
		const draw = new Array<number>(values.length);
		for (let index = 0; index < values.length; index += 1) {
			const pick = Math.floor(random() * values.length);
			draw[index] = values[pick] ?? 0;
		}
		samples.push(coefficientOfVariation(draw));
	}
	samples.sort((a, b) => a - b);
	const lowIndex = Math.floor(0.025 * resamples);
	const highIndex = Math.min(resamples - 1, Math.floor(0.975 * resamples));
	return [samples[lowIndex] ?? 0, samples[highIndex] ?? 0];
}

export function scoreFromCv(cv: number): number {
	if (!Number.isFinite(cv) || cv <= 0) return 0;
	return SCORE_SCALE * Math.min(cv / CV_ANCHOR, 1);
}

export function gapEntropyBits(gaps: number[]): number {
	if (gaps.length === 0) return 0;
	const bins = new Array<number>(GAP_BINS).fill(0);
	for (const gap of gaps) {
		const raw = Math.floor(gap / GAP_BIN_MS);
		const index = Math.min(GAP_BINS - 1, Math.max(0, raw));
		bins[index] = (bins[index] ?? 0) + 1;
	}
	let bits = 0;
	for (const count of bins) {
		if (count > 0) {
			const probability = count / gaps.length;
			bits -= probability * Math.log2(probability);
		}
	}
	return bits;
}

function trackedKeydowns(events: EventRecord[]): EventRecord[] {
	return events.filter(
		(event) =>
			event.type === "down" && event.repeat !== true && !isModifierEvent(event),
	);
}

function gapsFrom(events: EventRecord[]): {
	gaps: number[];
	pauseCount: number;
} {
	const downs = trackedKeydowns(events);
	const gaps: number[] = [];
	let pauseCount = 0;
	for (let index = 1; index < downs.length; index += 1) {
		const current = downs[index];
		const previous = downs[index - 1];
		if (!current || !previous) continue;
		const gap = current.t - previous.t;
		if (gap <= 0) continue;
		if (gap > MAX_GAP_MS) {
			pauseCount += 1;
			continue;
		}
		gaps.push(gap);
	}
	return { gaps, pauseCount };
}

function holdsFrom(events: EventRecord[]): number[] {
	const downAt = new Map<string, number>();
	const holds: number[] = [];
	for (const event of events) {
		const keyId = eventKeyId(event);
		if (event.type === "down") {
			if (event.repeat === true) continue;
			downAt.set(keyId, event.t);
			continue;
		}
		const start = downAt.get(keyId);
		if (start === undefined) continue;
		downAt.delete(keyId);
		const hold = event.t - start;
		if (hold >= 0 && hold <= MAX_HOLD_MS) holds.push(hold);
	}
	return holds;
}

function buildVerdict(input: {
	gapCount: number;
	scoreCi: [number, number];
}): Verdict {
	const [low, high] = input.scoreCi;
	if (input.gapCount < MIN_GAPS) {
		return {
			key: "insufficient-data",
			label: "Not enough data",
			tone: "neutral",
			reason: `${input.gapCount} of ${MIN_GAPS} needed gaps collected.`,
		};
	}
	if (low >= HUMAN_SCORE) {
		return {
			key: "human-like",
			label: "Human-like",
			tone: "good",
			reason: `The 95% confidence interval ${low.toFixed(1)}–${high.toFixed(1)} sits entirely at or above ${HUMAN_SCORE}.`,
		};
	}
	if (high <= MACHINE_SCORE) {
		return {
			key: "machine-like",
			label: "Machine-like",
			tone: "warn",
			reason: `The 95% confidence interval ${low.toFixed(1)}–${high.toFixed(1)} sits entirely at or below ${MACHINE_SCORE}.`,
		};
	}
	return {
		key: "mixed",
		label: "Mixed",
		tone: "neutral",
		reason: `The 95% confidence interval ${low.toFixed(1)}–${high.toFixed(1)} straddles the two bands.`,
	};
}

function buildFlags(
	verdict: Verdict,
	trackedKeys: number,
	backspaceRate: number,
): string[] {
	const flags: string[] = [];
	if (verdict.key === "machine-like") flags.push("machine-like");
	if (trackedKeys >= MIN_KEYS_FOR_EDIT_FLAG && backspaceRate > HIGH_EDIT_RATE) {
		flags.push("high-edit-rate");
	}
	return flags;
}

type BaseMetrics = Omit<TypingMetrics, "explanations">;

function countLabel(count: number, singular: string): string {
	return `${count} ${singular}${count === 1 ? "" : "s"}`;
}

function buildExplanations(metrics: BaseMetrics): MetricExplanation[] {
	const gapLabel = countLabel(metrics.gaps.length, "gap");
	const explanations: MetricExplanation[] = [
		{
			label: "Entropy",
			text: `Entropy spreads your ${gapLabel} across fixed ${GAP_BIN_MS} ms bins from 0 to ${MAX_GAP_MS} ms and measures the result in bits. Identical gaps give 0 bits; this sample gave ${metrics.entropyBits.toFixed(1)} bits.`,
		},
		{
			label: "Rhythm",
			text: `Rhythm is the median gap: sort all ${gapLabel} and take the middle one. Your median is ${metrics.medianGapMs} ms (mean ${Math.round(metrics.meanGapMs)} ms).`,
		},
		{
			label: "Human-likeness",
			text: `Score = ${SCORE_SCALE} × min(CV ÷ ${CV_ANCHOR}, 1), where CV is the standard deviation of your gaps divided by their mean. Your CV is ${metrics.cv.toFixed(2)} (95% CI ${metrics.cvCi95[0].toFixed(2)}–${metrics.cvCi95[1].toFixed(2)}), so the score is ${metrics.humanScore.toFixed(1)}/${SCORE_SCALE} (95% CI ${metrics.humanScoreCi95[0].toFixed(1)}–${metrics.humanScoreCi95[1].toFixed(1)}). At CV ${CV_ANCHOR} the score reaches ${SCORE_SCALE}.`,
		},
		{
			label: "Average hold",
			text:
				metrics.holds.length > 0
					? `Average hold is the mean time from a key's down event to its up event across ${countLabel(metrics.holds.length, "press")}: ${metrics.avgHoldMs} ms.`
					: "Average hold needs key-up events. This sample had none, so it is 0 ms.",
		},
		{
			label: "Backspace rate",
			text: `Backspace rate is corrections ÷ non-modifier key presses: ${metrics.corrections} of ${metrics.trackedKeys} (${Math.round(metrics.backspaceRate * 100)}%). The high-edit-rate flag needs more than ${Math.round(HIGH_EDIT_RATE * 100)}% and at least ${MIN_KEYS_FOR_EDIT_FLAG} key presses.`,
		},
	];
	for (const flag of metrics.flags) {
		if (flag === "machine-like") {
			explanations.push({
				label: "machine-like",
				text: `Flagged because the upper bound of the score's 95% confidence interval (${metrics.humanScoreCi95[1].toFixed(1)}) is at or below ${MACHINE_SCORE}.`,
			});
		}
		if (flag === "high-edit-rate") {
			explanations.push({
				label: "high-edit-rate",
				text: `Flagged because ${Math.round(metrics.backspaceRate * 100)}% of ${metrics.trackedKeys} non-modifier presses were Backspace or Delete — above ${Math.round(HIGH_EDIT_RATE * 100)}% with at least ${MIN_KEYS_FOR_EDIT_FLAG} presses.`,
			});
		}
	}
	if (metrics.pauseCount > 0) {
		explanations.push({
			label: "Pauses",
			text: `${countLabel(metrics.pauseCount, "gap")} over ${MAX_GAP_MS} ms ${metrics.pauseCount === 1 ? "was" : "were"} treated as a thinking pause and excluded from the gap statistics.`,
		});
	}
	return explanations;
}

export function generateReadout(metrics: TypingMetrics): string {
	const summary = [
		`Entropy ${metrics.entropyBits.toFixed(1)} bits`,
		`median gap ${metrics.medianGapMs} ms`,
		`human-likeness ${metrics.humanScore.toFixed(1)}/${SCORE_SCALE} (95% CI ${metrics.humanScoreCi95[0].toFixed(1)}–${metrics.humanScoreCi95[1].toFixed(1)})`,
		`Average hold ${metrics.avgHoldMs} ms`,
		`backspace rate ${Math.round(metrics.backspaceRate * 100)}%`,
	].join(" — ");
	return `${summary}. Verdict: ${metrics.verdict.label}. ${metrics.verdict.reason}`;
}

export function computeMetrics(events: EventRecord[]): TypingMetrics {
	const downs = trackedKeydowns(events);
	const { gaps, pauseCount } = gapsFrom(events);
	const holds = holdsFrom(events);
	const trackedKeys = downs.length;
	const corrections = downs.filter(isCorrectionEvent).length;
	const backspaceRate = trackedKeys > 0 ? corrections / trackedKeys : 0;
	const cv = coefficientOfVariation(gaps);
	const cvCi95 = bootstrapCvCi(gaps);
	const humanScore = scoreFromCv(cv);
	const humanScoreCi95: [number, number] = [
		scoreFromCv(cvCi95[0]),
		scoreFromCv(cvCi95[1]),
	];
	const verdict = buildVerdict({
		gapCount: gaps.length,
		scoreCi: humanScoreCi95,
	});
	const flags = buildFlags(verdict, trackedKeys, backspaceRate);
	const base: BaseMetrics = {
		gaps,
		holds,
		trackedKeys,
		corrections,
		pauseCount,
		meanGapMs: mean(gaps),
		medianGapMs: Math.round(median(gaps)),
		cv,
		cvCi95,
		entropyBits: gapEntropyBits(gaps),
		avgHoldMs: holds.length > 0 ? Math.round(mean(holds)) : 0,
		backspaceRate,
		humanScore,
		humanScoreCi95,
		flags,
		verdict,
	};
	return { ...base, explanations: buildExplanations(base) };
}
