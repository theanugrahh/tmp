export type EventType = "down" | "up";

export interface TypingEvent {
	type: EventType;
	key: string;
	t: number;
	repeat?: boolean;
}

export interface AnalyzeEvent {
	type: EventType;
	keyId: string;
	t: number;
	repeat?: boolean;
	modifier: boolean;
	correction: boolean;
}

export type VerdictKey =
	| "insufficient-data"
	| "human-like"
	| "mixed"
	| "machine-like";

export type VerdictTone = "good" | "warn" | "neutral";

export interface Verdict {
	key: VerdictKey;
	label: string;
	tone: VerdictTone;
	reason: string;
}

export interface MetricExplanation {
	label: string;
	text: string;
}

export interface TypingMetrics {
	gaps: number[];
	holds: number[];
	trackedKeys: number;
	corrections: number;
	pauseCount: number;
	meanGapMs: number;
	medianGapMs: number;
	cv: number;
	cvCi95: [number, number];
	entropyBits: number;
	avgHoldMs: number;
	backspaceRate: number;
	humanScore: number;
	humanScoreCi95: [number, number];
	flags: string[];
	verdict: Verdict;
	explanations: MetricExplanation[];
}
