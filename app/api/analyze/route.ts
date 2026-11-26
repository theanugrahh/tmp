import { type NextRequest, NextResponse } from "next/server";
import { computeMetrics, generateReadout } from "@/lib/metrics";
import type { AnalyzeEvent } from "@/lib/types";

const MAX_EVENTS = 1000;
const MAX_KEY_ID_LENGTH = 32;
const MAX_CAPTURE_SPAN_MS = 600000;

function fail(message: string, status: number) {
	return NextResponse.json({ error: message }, { status });
}

function isValidEvent(value: unknown): value is AnalyzeEvent {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const event = value as Record<string, unknown>;
	if ("key" in event) return false;
	if (event.type !== "down" && event.type !== "up") return false;
	if (typeof event.keyId !== "string") return false;
	if (event.keyId.length < 1 || event.keyId.length > MAX_KEY_ID_LENGTH) {
		return false;
	}
	if (typeof event.modifier !== "boolean") return false;
	if (typeof event.correction !== "boolean") return false;
	if (typeof event.t !== "number" || !Number.isFinite(event.t)) return false;
	if (event.t < 0) return false;
	if (event.repeat !== undefined && typeof event.repeat !== "boolean") {
		return false;
	}
	return true;
}

export async function POST(request: NextRequest) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return fail("Body must be valid JSON", 400);
	}

	const events = (body as { events?: unknown } | null)?.events;
	if (!Array.isArray(events)) {
		return fail("Expected an object with an events array", 400);
	}
	if (events.length < 2) {
		return fail("Provide at least two keystroke events", 400);
	}
	if (events.length > MAX_EVENTS) {
		return fail(`Too many events (max ${MAX_EVENTS})`, 413);
	}
	if (!events.every(isValidEvent)) {
		return fail(
			`Each event needs a type of "down" or "up", an opaque key ID of 1–${MAX_KEY_ID_LENGTH} characters, modifier/correction flags, and a finite non-negative timestamp`,
			400,
		);
	}

	const typedEvents: AnalyzeEvent[] = events;
	const firstEvent = typedEvents[0];
	const lastEvent = typedEvents[typedEvents.length - 1];
	if (
		firstEvent &&
		lastEvent &&
		lastEvent.t - firstEvent.t > MAX_CAPTURE_SPAN_MS
	) {
		return fail(
			`Timestamps must span no more than ${MAX_CAPTURE_SPAN_MS} ms`,
			400,
		);
	}
	for (let index = 1; index < typedEvents.length; index += 1) {
		const current = typedEvents[index];
		const previous = typedEvents[index - 1];
		if (current && previous && current.t < previous.t) {
			return fail("Timestamps must be non-decreasing", 422);
		}
	}

	const trackedKeys = typedEvents.filter(
		(event) =>
			event.type === "down" && event.repeat !== true && !event.modifier,
	).length;
	if (trackedKeys < 2) {
		return fail("Provide at least two non-modifier key presses", 422);
	}

	const metrics = computeMetrics(typedEvents);
	return NextResponse.json({ metrics, readout: generateReadout(metrics) });
}
