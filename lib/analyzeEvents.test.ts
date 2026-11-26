import { describe, expect, it } from "vitest";
import { toAnalyzeEvents } from "./analyzeEvents";
import type { TypingEvent } from "./types";

function capture(): TypingEvent[] {
	return [
		{ type: "down", key: "a", t: 0 },
		{ type: "up", key: "a", t: 40 },
		{ type: "down", key: "a", t: 100, repeat: true },
		{ type: "down", key: "Shift", t: 140 },
		{ type: "up", key: "Shift", t: 180 },
		{ type: "down", key: "Backspace", t: 220 },
		{ type: "up", key: "Backspace", t: 260 },
	];
}

describe("toAnalyzeEvents", () => {
	it("replaces literal keys with stable opaque IDs and keeps timing", () => {
		const result = toAnalyzeEvents(capture());

		expect(result.every((event) => !("key" in event))).toBe(true);
		expect(result.slice(0, 3).map((event) => event.keyId)).toEqual([
			"k0",
			"k0",
			"k0",
		]);
		expect(result.map((event) => event.t)).toEqual([
			0, 40, 100, 140, 180, 220, 260,
		]);
		expect(result[2]?.repeat).toBe(true);
	});

	it("marks modifiers and corrections without preserving key text", () => {
		const result = toAnalyzeEvents(capture());
		const shiftDown = result.find((event) => event.keyId === "k1");
		const backspaceDown = result.find((event) => event.keyId === "k2");
		const ids = result.map((event) => event.keyId);

		expect(ids).not.toContain("Shift");
		expect(ids).not.toContain("Backspace");
		expect(ids).not.toContain("a");
		expect(shiftDown?.modifier).toBe(true);
		expect(shiftDown?.correction).toBe(false);
		expect(backspaceDown?.correction).toBe(true);
		expect(backspaceDown?.modifier).toBe(false);
	});
});
