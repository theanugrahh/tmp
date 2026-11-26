import { act, renderHook } from "@testing-library/react";
import type { KeyboardEvent } from "react";
import { describe, expect, it } from "vitest";
import { useTypingCapture } from "./useTypingCapture";

function keyEvent(key: string, repeat = false): KeyboardEvent {
	return { key, repeat } as unknown as KeyboardEvent;
}

describe("useTypingCapture", () => {
	it("counts only tracked key presses while recording every event", () => {
		const { result } = renderHook(() => useTypingCapture());
		expect(result.current.count).toBe(0);
		expect(result.current.capturing).toBe(false);

		act(() => result.current.start());
		expect(result.current.capturing).toBe(true);

		act(() => result.current.handleKeyDown(keyEvent("Shift")));
		expect(result.current.count).toBe(0);

		act(() => result.current.handleKeyDown(keyEvent("h")));
		act(() => result.current.handleKeyUp(keyEvent("h")));
		act(() => result.current.handleKeyDown(keyEvent("h", true)));
		act(() => result.current.handleKeyDown(keyEvent("i")));

		expect(result.current.count).toBe(2);

		let events: ReturnType<typeof result.current.stop> = [];
		act(() => {
			events = result.current.stop();
		});
		expect(events.length).toBe(5);
		expect(events[0]).toMatchObject({ type: "down", key: "Shift" });
		expect(result.current.capturing).toBe(false);
		expect(result.current.count).toBe(0);
	});

	it("clears buffered events when capture stops", () => {
		const { result } = renderHook(() => useTypingCapture());
		act(() => result.current.start());
		act(() => result.current.handleKeyDown(keyEvent("a")));
		act(() => result.current.stop());

		let events: ReturnType<typeof result.current.stop> = [];
		act(() => {
			events = result.current.stop();
		});
		expect(events).toEqual([]);
	});

	it("ignores key events while idle", () => {
		const { result } = renderHook(() => useTypingCapture());
		act(() => result.current.handleKeyDown(keyEvent("a")));
		expect(result.current.count).toBe(0);
	});

	it("resets the counter on a new capture", () => {
		const { result } = renderHook(() => useTypingCapture());
		act(() => result.current.start());
		act(() => result.current.handleKeyDown(keyEvent("a")));
		expect(result.current.count).toBe(1);
		act(() => result.current.stop());
		act(() => result.current.start());
		expect(result.current.count).toBe(0);
	});
});
