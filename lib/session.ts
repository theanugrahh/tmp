import { downloadText } from "./profileStorage";
import type { TypingMetrics } from "./types";

export interface SessionExport {
	version: 1;
	sentence: string;
	createdAt: string;
	events: { type: string; key: string; t: number; repeat?: boolean }[];
	metrics: TypingMetrics;
}

export function buildSession(
	events: { type: string; key: string; t: number; repeat?: boolean }[],
	metrics: TypingMetrics,
	sentence: string,
): SessionExport {
	return {
		version: 1,
		sentence,
		createdAt: new Date().toISOString(),
		events,
		metrics,
	};
}

export function downloadSession(
	events: { type: string; key: string; t: number; repeat?: boolean }[],
	metrics: TypingMetrics,
	sentence: string,
) {
	const session = buildSession(events, metrics, sentence);
	downloadText(
		`tmp-session-${session.createdAt.slice(0, 10)}.json`,
		JSON.stringify(session, null, 2),
		"application/json",
	);
}
