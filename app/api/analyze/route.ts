import { type NextRequest, NextResponse } from "next/server";
import { computeMetrics, generateReadout } from "@/lib/metrics";
import type { TypingEvent } from "@/lib/types";

const MAX_EVENTS = 1000;

function isValidEvent(value: unknown): value is TypingEvent {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const event = value as Record<string, unknown>;
	return (
		(event.type === "down" || event.type === "up") &&
		typeof event.key === "string" &&
		typeof event.t === "number" &&
		Number.isFinite(event.t)
	);
}

export async function POST(request: NextRequest) {
	let body: unknown;
	try {
		body = await request.json();
	} catch {
		return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
	}

	const events = (body as { events?: unknown } | null)?.events;
	if (
		!Array.isArray(events) ||
		events.length < 2 ||
		events.length > MAX_EVENTS
	) {
		return NextResponse.json(
			{ error: "Provide at least two keystroke events" },
			{ status: 400 },
		);
	}

	const typedEvents: TypingEvent[] = [];
	for (const value of events) {
		if (!isValidEvent(value)) {
			return NextResponse.json(
				{ error: "Invalid typing event" },
				{ status: 400 },
			);
		}
		typedEvents.push(value);
	}

	const metrics = computeMetrics(typedEvents);
	return NextResponse.json({ metrics, readout: generateReadout(metrics) });
}
