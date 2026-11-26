import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	CONSENT_POLICY_VERSION,
	CONSENT_STORAGE_KEY,
	clearConsent,
	loadConsent,
	saveConsent,
} from "./consentStorage";

describe("consentStorage", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("returns null when no consent decision is stored", () => {
		expect(loadConsent()).toBeNull();
	});

	it("round-trips an accepted decision with the policy version", () => {
		const decidedAt = "2026-01-01T00:00:00.000Z";

		expect(saveConsent("accepted", decidedAt)).toBe(true);
		expect(loadConsent()).toEqual({
			version: 1,
			policyVersion: CONSENT_POLICY_VERSION,
			status: "accepted",
			decidedAt,
		});
	});

	it("round-trips a declined decision", () => {
		expect(saveConsent("declined")).toBe(true);
		expect(loadConsent()?.status).toBe("declined");
	});

	it("rejects malformed and outdated records", () => {
		window.localStorage.setItem(
			CONSENT_STORAGE_KEY,
			JSON.stringify({
				version: 99,
				policyVersion: CONSENT_POLICY_VERSION,
				status: "accepted",
				decidedAt: "2026-01-01T00:00:00.000Z",
			}),
		);
		expect(loadConsent()).toBeNull();

		window.localStorage.setItem(
			CONSENT_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				policyVersion: "old-policy",
				status: "accepted",
				decidedAt: "2026-01-01T00:00:00.000Z",
			}),
		);
		expect(loadConsent()).toBeNull();

		window.localStorage.setItem(CONSENT_STORAGE_KEY, "not json");
		expect(loadConsent()).toBeNull();
	});

	it("fails closed when storage writes or removes are blocked", () => {
		vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		expect(saveConsent("accepted")).toBe(false);

		vi.restoreAllMocks();
		window.localStorage.setItem(
			CONSENT_STORAGE_KEY,
			JSON.stringify({
				version: 1,
				policyVersion: CONSENT_POLICY_VERSION,
				status: "accepted",
				decidedAt: "2026-01-01T00:00:00.000Z",
			}),
		);
		vi.spyOn(Storage.prototype, "removeItem").mockImplementation(() => {
			throw new Error("blocked");
		});
		expect(clearConsent()).toBe(false);
	});
});
