import type { KeyboardEvent } from "react";
import { useCallback, useRef, useState } from "react";
import { isModifierKey } from "@/lib/keys";
import type { TypingEvent } from "@/lib/types";

export function useTypingCapture() {
	const eventsRef = useRef<TypingEvent[]>([]);
	const [capturing, setCapturing] = useState(false);
	const [count, setCount] = useState(0);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (!capturing) return;
			eventsRef.current.push({
				type: "down",
				key: event.key,
				t: performance.now(),
				repeat: event.repeat === true ? true : undefined,
			});
			if (!isModifierKey(event.key) && !event.repeat) {
				setCount((value) => value + 1);
			}
		},
		[capturing],
	);

	const handleKeyUp = useCallback(
		(event: KeyboardEvent) => {
			if (!capturing) return;
			eventsRef.current.push({
				type: "up",
				key: event.key,
				t: performance.now(),
			});
		},
		[capturing],
	);

	const start = useCallback(() => {
		eventsRef.current = [];
		setCount(0);
		setCapturing(true);
	}, []);

	const stop = useCallback(() => {
		const events = eventsRef.current;
		eventsRef.current = [];
		setCapturing(false);
		setCount(0);
		return events;
	}, []);

	return { capturing, count, start, stop, handleKeyDown, handleKeyUp };
}
