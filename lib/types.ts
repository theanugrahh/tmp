export type EventType = "down" | "up";

export interface TypingEvent {
	type: EventType;
	key: string;
	t: number;
}

export interface TypingMetrics {
	entropy: number;
	regularity: number;
	humanScore: number;
	backspaceRate: number;
	avgHoldMs: number;
	flags: string[];
	intervals: number[];
	holds: number[];
}
