import { isModifierKey } from "./keys";
import type { AnalyzeEvent, TypingEvent } from "./types";

export function toAnalyzeEvents(events: TypingEvent[]): AnalyzeEvent[] {
	const keyIds = new Map<string, string>();

	return events.map((event) => {
		let keyId = keyIds.get(event.key);
		if (!keyId) {
			keyId = `k${keyIds.size}`;
			keyIds.set(event.key, keyId);
		}

		return {
			type: event.type,
			keyId,
			t: event.t,
			...(event.repeat === true ? { repeat: true } : {}),
			modifier: isModifierKey(event.key),
			correction: event.key === "Backspace" || event.key === "Delete",
		};
	});
}

export function eventKeyId(event: TypingEvent | AnalyzeEvent): string {
	return "keyId" in event ? event.keyId : event.key;
}

export function isModifierEvent(event: TypingEvent | AnalyzeEvent): boolean {
	return "modifier" in event ? event.modifier : isModifierKey(event.key);
}

export function isCorrectionEvent(event: TypingEvent | AnalyzeEvent): boolean {
	return "correction" in event
		? event.correction
		: event.key === "Backspace" || event.key === "Delete";
}
