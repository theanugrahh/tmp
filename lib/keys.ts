export const MODIFIER_KEYS: ReadonlySet<string> = new Set([
	"Control",
	"Alt",
	"Meta",
	"Shift",
	"CapsLock",
	"Tab",
	"Escape",
	"Dead",
	"Process",
	"Unidentified",
]);

export function isModifierKey(key: string): boolean {
	return MODIFIER_KEYS.has(key);
}
