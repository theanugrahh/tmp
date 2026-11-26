import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { computeMetrics } from "./metrics";
import { createProfile, featureVector } from "./profile";
import {
	clearProfiles,
	downloadText,
	importProfileFile,
	loadProfiles,
	MAX_PROFILE_FILE_BYTES,
	PROFILE_STORAGE_KEY,
	removeProfile,
	saveProfiles,
	upsertProfile,
} from "./profileStorage";
import type { TypingEvent } from "./types";

function sample() {
	const events: TypingEvent[] = [];
	let t = 0;
	for (const gap of [
		100, 140, 200, 120, 180, 160, 220, 110, 150, 190, 130, 170,
	]) {
		if (events.length === 0) events.push({ type: "down", key: "a", t });
		t += gap;
		events.push({ type: "down", key: `k${t}`, t });
	}
	return featureVector(computeMetrics(events));
}

function profile(id: string, name: string) {
	return createProfile({
		name,
		sentence: "A sentence.",
		samples: [sample(), sample(), sample()],
		id,
		createdAt: "2026-01-01T00:00:00.000Z",
		salt: `salt-${id}`,
	});
}

describe("profile storage", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it("loads an empty vault only when storage is empty", () => {
		expect(loadProfiles()).toEqual([]);
		window.localStorage.setItem(PROFILE_STORAGE_KEY, "[]");
		expect(loadProfiles()).toEqual([]);
	});

	it("throws on malformed or non-array profile storage", () => {
		window.localStorage.setItem(PROFILE_STORAGE_KEY, "{");
		expect(() => loadProfiles()).toThrow(/load/i);
		window.localStorage.setItem(PROFILE_STORAGE_KEY, "{}");
		expect(() => loadProfiles()).toThrow(/load/i);
	});

	it("throws instead of dropping invalid profiles", () => {
		const valid = profile("valid", "Valid");
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([valid, { version: 99 }]),
		);
		expect(() => loadProfiles()).toThrow(/load/i);
	});

	it("saves, replaces, and removes profiles", () => {
		const first = profile("one", "One");
		const second = profile("two", "Two");
		const renamed = createProfile({
			name: "Renamed",
			sentence: "A sentence.",
			samples: [sample(), sample(), sample()],
			id: "one",
			createdAt: "2026-01-01T00:00:00.000Z",
			salt: "salt-one",
		});
		expect(saveProfiles([first])).toBe(true);
		expect(loadProfiles()).toEqual([first]);

		let profiles = loadProfiles();
		profiles = upsertProfile(profiles, second);
		expect(loadProfiles().map((item) => item.id)).toEqual(["one", "two"]);

		profiles = upsertProfile(profiles, renamed);
		expect(loadProfiles()).toHaveLength(2);
		expect(loadProfiles().find((item) => item.id === "one")?.name).toBe(
			"Renamed",
		);

		profiles = removeProfile(profiles, "one");
		expect(loadProfiles().map((item) => item.id)).toEqual(["two"]);
	});

	it("clears the vault when profiles are withdrawn", () => {
		expect(saveProfiles([profile("one", "One")])).toBe(true);
		expect(clearProfiles()).toEqual([]);
		expect(loadProfiles()).toEqual([]);
		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBe("[]");
	});

	it("throws when a profile change cannot be persisted", () => {
		const first = profile("one", "One");
		const second = profile("two", "Two");
		expect(saveProfiles([first])).toBe(true);

		const setItem = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation(() => {
				throw new Error("quota exceeded");
			});

		expect(() => upsertProfile(loadProfiles(), second)).toThrow(/save/i);
		expect(() => removeProfile(loadProfiles(), "one")).toThrow(/save/i);
		expect(() => clearProfiles()).toThrow(/save/i);
		setItem.mockRestore();
	});

	it("defers object URL revocation until after the download click", async () => {
		const revoke = vi.fn();
		vi.useFakeTimers();
		Object.defineProperty(URL, "createObjectURL", {
			configurable: true,
			value: () => "blob:test",
		});
		Object.defineProperty(URL, "revokeObjectURL", {
			configurable: true,
			value: revoke,
		});
		vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {
			expect(revoke).not.toHaveBeenCalled();
		});

		downloadText("test.json", "{}", "application/json");
		expect(revoke).not.toHaveBeenCalled();

		await vi.runAllTimersAsync();
		expect(revoke).toHaveBeenCalledWith("blob:test");
	});

	it("rejects imported files that are not JSON", async () => {
		const file = new File(["{}"], "profile.txt", { type: "text/plain" });
		await expect(importProfileFile(file)).rejects.toThrow(/json/i);
	});

	it("rejects oversized imported files", async () => {
		const file = new File(
			["x".repeat(MAX_PROFILE_FILE_BYTES + 1)],
			"profile.json",
			{ type: "application/json" },
		);
		await expect(importProfileFile(file)).rejects.toThrow(/large/i);
	});
});
