import type { TypingEvent, TypingMetrics } from "./types";

const MAX_SCORE = 5;
const INTERVAL_BINS = 16;
const MODIFIER_KEYS = new Set([
	"Control",
	"Alt",
	"Meta",
	"Shift",
	"CapsLock",
	"Tab",
	"Escape",
]);

function isModifierKey(key: string): boolean {
	return MODIFIER_KEYS.has(key);
}

function trackedKeydowns(events: TypingEvent[]): TypingEvent[] {
	return events.filter(
		(event) => event.type === "down" && !isModifierKey(event.key),
	);
}

function intervalsBetween(events: TypingEvent[]): number[] {
	const downTimes: number[] = [];
	for (const event of trackedKeydowns(events)) {
		downTimes.push(event.t);
	}
	const intervals: number[] = [];
	for (let index = 1; index < downTimes.length; index += 1) {
		const previous = downTimes[index - 1];
		const current = downTimes[index];
		if (previous !== undefined && current !== undefined && current > previous) {
			intervals.push(current - previous);
		}
	}
	return intervals;
}

function averageHolds(events: TypingEvent[]): number[] {
	const downsByKey = new Map<string, number>();
	const holds: number[] = [];
	for (const event of events) {
		if (event.type === "down") {
			downsByKey.set(event.key, event.t);
			continue;
		}
		const downTime = downsByKey.get(event.key);
		if (downTime !== undefined) {
			holds.push(event.t - downTime);
		}
	}
	return holds;
}

function clampScore(value: number): number {
	return Math.min(MAX_SCORE, Math.max(0, value));
}

function entropy(intervals: number[]): number {
	if (intervals.length === 0) {
		return 0;
	}
	const min = Math.min(...intervals);
	const max = Math.max(...intervals);
	if (max - min <= 0) {
		return 0;
	}
	const bins = new Array<number>(INTERVAL_BINS).fill(0);
	for (const interval of intervals) {
		const index = Math.min(
			INTERVAL_BINS - 1,
			Math.floor(((interval - min) / (max - min)) * INTERVAL_BINS),
		);
		bins[index] = (bins[index] ?? 0) + 1;
	}
	const total = intervals.length;
	let entropyValue = 0;
	for (const count of bins) {
		if (count > 0) {
			entropyValue -= (count / total) * Math.log2(count / total);
		}
	}
	return Math.round((MAX_SCORE * entropyValue) / Math.log2(INTERVAL_BINS));
}

function regularity(intervals: number[]): number {
	if (intervals.length === 0) {
		return 0;
	}
	const mean =
		intervals.reduce((sum, value) => sum + value, 0) / intervals.length;
	if (mean <= 0) {
		return MAX_SCORE;
	}
	const variance =
		intervals.reduce((sum, value) => sum + (value - mean) ** 2, 0) /
		intervals.length;
	const cv = Math.sqrt(variance) / mean;
	return clampScore(MAX_SCORE - 5 * cv);
}

function countBackspaces(events: TypingEvent[]): number {
	return events.filter(
		(event) => event.key === "Backspace" || event.key === "Delete",
	).length;
}

function generateFlags(metrics: {
	humanScore: number;
	backspaceRate: number;
}): string[] {
	const flags: string[] = [];
	if (metrics.humanScore <= 1.5) {
		flags.push("machine-like");
	}
	if (metrics.backspaceRate > 0.15) {
		flags.push("high-edit-rate");
	}
	return flags;
}

export function computeMetrics(events: TypingEvent[]): TypingMetrics {
	const intervals = intervalsBetween(events);
	const holds = averageHolds(events);
	const entropyValue = entropy(intervals);
	const regularityValue = regularity(intervals);
	const humanScore = intervals.length
		? clampScore((MAX_SCORE * (entropyValue - regularityValue + 1)) / 2)
		: 0;
	const tracked = trackedKeydowns(events);
	const backspaceRate =
		tracked.length > 0 ? countBackspaces(events) / tracked.length : 0;
	const avgHoldMs =
		holds.length > 0
			? Math.round(holds.reduce((sum, value) => sum + value, 0) / holds.length)
			: 0;
	return {
		entropy: entropyValue,
		regularity: regularityValue,
		humanScore,
		backspaceRate,
		avgHoldMs,
		flags: generateFlags({ humanScore, backspaceRate }),
		intervals,
		holds,
	};
}

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

export function generateReadout(metrics: TypingMetrics): string {
	const parts: string[] = [
		`Entropy ${round1(metrics.entropy)}/5 — rhythm ${round1(metrics.regularity)}/5 — human-likeness ${round1(metrics.humanScore)}/5, average hold ${Math.round(metrics.avgHoldMs)} ms.`,
	];
	if (metrics.humanScore >= 4) {
		parts.push(
			"Your rhythm is extremely human-like: variable gaps between key presses — hard for a script to reproduce.",
		);
	} else {
		parts.push(
			"Your rhythm is regular with limited variability; this pattern is machine-like — high confidence, flagged.",
		);
	}
	if (metrics.backspaceRate > 0.15) {
		parts.push(
			`Backspace rate ${Math.round(metrics.backspaceRate * 100)}% — frequent corrections. That is a high edit rate.`,
		);
	}
	return parts.join(" ");
}
