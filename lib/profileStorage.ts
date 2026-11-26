import { parseProfile, type TypingProfile } from "./profile";

export const PROFILE_STORAGE_KEY = "tmp.profiles.v1";
export const MAX_PROFILE_FILE_BYTES = 256 * 1024;
const PROFILE_LOAD_ERROR =
	"Stored profiles could not be loaded in this browser.";

function browserStorage(): Storage | null {
	return typeof window === "undefined" ? null : window.localStorage;
}

function storage(): Storage | null {
	try {
		return browserStorage();
	} catch {
		return null;
	}
}

export function loadProfiles(): TypingProfile[] {
	let store: Storage | null;
	try {
		store = browserStorage();
	} catch {
		throw new Error(PROFILE_LOAD_ERROR);
	}
	if (store === null) return [];
	try {
		const raw = store.getItem(PROFILE_STORAGE_KEY);
		if (raw === null) return [];
		const parsed: unknown = JSON.parse(raw);
		if (!Array.isArray(parsed)) {
			throw new Error(PROFILE_LOAD_ERROR);
		}
		return parsed.map((item) => parseProfile(item));
	} catch {
		throw new Error(PROFILE_LOAD_ERROR);
	}
}

export function saveProfiles(profiles: TypingProfile[]): boolean {
	const store = storage();
	if (store === null) return false;
	try {
		store.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profiles));
		return true;
	} catch {
		return false;
	}
}

function persistOrThrow(profiles: TypingProfile[]): void {
	if (!saveProfiles(profiles)) {
		throw new Error("Profiles could not be saved in this browser.");
	}
}

export function upsertProfile(
	profiles: TypingProfile[],
	profile: TypingProfile,
): TypingProfile[] {
	const exists = profiles.some((item) => item.id === profile.id);
	const next = exists
		? profiles.map((item) => (item.id === profile.id ? profile : item))
		: [...profiles, profile];
	persistOrThrow(next);
	return next;
}

export function removeProfile(
	profiles: TypingProfile[],
	id: string,
): TypingProfile[] {
	const next = profiles.filter((profile) => profile.id !== id);
	persistOrThrow(next);
	return next;
}

export function clearProfiles(): TypingProfile[] {
	persistOrThrow([]);
	return [];
}

export function downloadText(filename: string, text: string, mime: string) {
	const blob = new Blob([text], { type: mime });
	const url = URL.createObjectURL(blob);
	const anchor = document.createElement("a");
	anchor.href = url;
	anchor.download = filename;
	document.body.append(anchor);
	anchor.click();
	anchor.remove();
	setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function exportProfileFile(profile: TypingProfile) {
	downloadText(
		`${profile.name.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "profile"}.tmp-profile.json`,
		JSON.stringify(profile, null, 2),
		"application/json",
	);
}

export async function importProfileFile(file: File): Promise<TypingProfile> {
	const isJson =
		file.type === "application/json" &&
		file.name.toLowerCase().endsWith(".json");
	if (!isJson) {
		throw new Error("Profile file must be a JSON file.");
	}
	if (file.size > MAX_PROFILE_FILE_BYTES) {
		throw new Error(
			`Profile file is too large (max ${MAX_PROFILE_FILE_BYTES / 1024} KB).`,
		);
	}
	const text = await file.text();
	return parseProfile(JSON.parse(text) as unknown);
}
