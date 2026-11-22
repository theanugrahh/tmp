import type { KeyboardEvent } from "react";
import { useCallback, useRef, useState } from "react";
import type { TypingEvent } from "@/lib/types";

export function useTypingCapture() {
	const eventsRef = useRef<TypingEvent[]>([]);
	const [capturing, setCapturing] = useState(false);

	const handleKeyDown = useCallback(
		(event: KeyboardEvent) => {
			if (!capturing) return;
			eventsRef.current.push({
				type: "down",
				key: event.key,
				t: performance.now(),
			});
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
		setCapturing(true);
	}, []);

	const stop = useCallback(() => {
		setCapturing(false);
		return eventsRef.current;
	}, []);

	return { capturing, start, stop, handleKeyDown, handleKeyUp };
}
