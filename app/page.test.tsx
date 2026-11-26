import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
	waitFor,
	within,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CONSENT_STORAGE_KEY } from "@/lib/consentStorage";
import { computeMetrics, generateReadout } from "@/lib/metrics";
import { createProfile, featureVector } from "@/lib/profile";
import { PROFILE_STORAGE_KEY } from "@/lib/profileStorage";
import type { TypingEvent } from "@/lib/types";
import Home from "./page";

function typingEvents(): TypingEvent[] {
	const events: TypingEvent[] = [];
	let time = 0;
	for (const key of "abcdefghijklmnop") {
		time += 100;
		events.push({ type: "down", key, t: time });
		events.push({ type: "up", key, t: time + 40 });
	}
	return events;
}

function sampleMetrics() {
	return computeMetrics(typingEvents());
}

function stubDownload() {
	Object.defineProperty(URL, "createObjectURL", {
		configurable: true,
		value: () => "blob:test",
	});
	Object.defineProperty(URL, "revokeObjectURL", {
		configurable: true,
		value: vi.fn(),
	});
	vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
}

function stubAnalysis() {
	const metrics = sampleMetrics();
	const readout = generateReadout(metrics);
	const fetchMock = vi.fn().mockResolvedValue({
		ok: true,
		json: async () => ({ metrics, readout }),
	});
	vi.stubGlobal("fetch", fetchMock);
	return fetchMock;
}

function stubDeferredAnalysis() {
	let resolveFetch: (value: unknown) => void = () => {};
	let requestSignal: AbortSignal | null = null;
	vi.stubGlobal(
		"fetch",
		vi.fn((_input: unknown, init?: RequestInit) => {
			requestSignal = init?.signal ?? null;
			return new Promise((resolve) => {
				resolveFetch = resolve;
			});
		}),
	);
	return {
		resolve(value: unknown) {
			resolveFetch(value);
		},
		get signal() {
			return requestSignal;
		},
	};
}

function successfulFetchResponse() {
	const metrics = sampleMetrics();
	return {
		ok: true,
		json: async () => ({ metrics, readout: generateReadout(metrics) }),
	};
}

function acceptConsent() {
	fireEvent.click(screen.getByRole("checkbox"));
	fireEvent.click(screen.getByRole("button", { name: "Allow data use" }));
}

function requestConsentReview() {
	fireEvent.click(screen.getByRole("button", { name: /privacy choices/i }));
}

function confirmWithdrawal() {
	fireEvent.click(
		screen.getByRole("button", { name: /delete profiles and change choice/i }),
	);
}

async function typeAndAnalyze() {
	const start =
		screen.queryByRole("button", { name: "Start capture" }) ??
		screen.getByRole("button", { name: "Start over" });
	fireEvent.click(start);
	const area = screen.getByRole("textbox", { name: "Typing area" });
	fireEvent.change(area, { target: { value: "abcdefghijklmnop" } });
	for (const key of "abcdefghijklmnop") {
		fireEvent.keyDown(area, { key });
		fireEvent.keyUp(area, { key });
	}
	fireEvent.click(screen.getByRole("button", { name: "Analyze" }));
	await waitFor(() => {
		expect(screen.queryByRole("textbox", { name: "Typing area" })).toBeNull();
	});
}

function seededProfile() {
	const vector = featureVector(sampleMetrics());
	return createProfile({
		name: "Seed",
		sentence: "abcdefghijklmnop",
		samples: [vector, vector, vector],
		id: "seed",
		createdAt: "2026-01-01T00:00:00.000Z",
		salt: "seed",
	});
}

function secondProfile() {
	const vector = featureVector(sampleMetrics());
	return createProfile({
		name: "Second",
		sentence: "abcdefghijklmnop",
		samples: [vector, vector, vector],
		id: "second",
		createdAt: "2026-01-02T00:00:00.000Z",
		salt: "second",
	});
}

function thirdProfile() {
	const vector = featureVector(sampleMetrics());
	return createProfile({
		name: "Third",
		sentence: "abcdefghijklmnop",
		samples: [vector, vector, vector],
		id: "third",
		createdAt: "2026-01-03T00:00:00.000Z",
		salt: "third",
	});
}

describe("workspace page", () => {
	beforeEach(() => {
		window.localStorage.clear();
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
		Reflect.deleteProperty(URL, "createObjectURL");
		Reflect.deleteProperty(URL, "revokeObjectURL");
	});

	it("asks for data-use consent before showing capture controls", () => {
		render(<Home />);

		expect(
			screen.getByRole("heading", { name: /your data, your choice/i }),
		).toBeTruthy();
		expect(screen.queryByRole("button", { name: /start capture/i })).toBeNull();
	});

	it("shows capture controls after explicit consent", () => {
		render(<Home />);

		acceptConsent();

		expect(screen.getByRole("button", { name: /start capture/i })).toBeTruthy();
	});

	it("connects the active mode tab to the workspace panel after consent", () => {
		render(<Home />);

		acceptConsent();

		const panel = screen.getByRole("tabpanel");
		expect(panel.id).toBe("workspace-panel");
		expect(panel.getAttribute("aria-labelledby")).toBe("mode-tab-analyze");
		expect(
			screen
				.getByRole("tab", { name: /analyze/i })
				.getAttribute("aria-controls"),
		).toBe(panel.id);
	});

	it("reports a stored profile vault that cannot be loaded", async () => {
		window.localStorage.setItem(PROFILE_STORAGE_KEY, "{");
		render(<Home />);

		acceptConsent();

		await waitFor(() =>
			expect(screen.getByRole("alert").textContent).toMatch(
				/could not be loaded/i,
			),
		);
	});

	it("lets a user withdraw consent after accepting", () => {
		render(<Home />);

		acceptConsent();
		expect(screen.getByRole("button", { name: /start capture/i })).toBeTruthy();

		requestConsentReview();
		confirmWithdrawal();

		expect(
			screen.getByRole("heading", { name: /your data, your choice/i }),
		).toBeTruthy();
		expect(screen.queryByRole("button", { name: /start capture/i })).toBeNull();
	});

	it("requires confirmation before deleting profiles and clearing consent", () => {
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile()]),
		);
		render(<Home />);

		acceptConsent();
		requestConsentReview();

		const dialog = screen.getByRole("alertdialog", {
			name: /delete saved profiles/i,
		});
		expect(dialog.textContent).toMatch(/1 saved profile/i);
		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toContain("Seed");
		expect(
			screen.getByRole("button", { name: /start capture/i, hidden: true }),
		).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: /keep profiles/i }));
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toContain("Seed");
		expect(screen.getByRole("button", { name: /start capture/i })).toBeTruthy();

		requestConsentReview();
		confirmWithdrawal();
		expect(
			screen.getByRole("heading", { name: /your data, your choice/i }),
		).toBeTruthy();
		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBe("[]");
	});

	it("focuses the withdrawal confirmation and closes it with Escape", () => {
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile()]),
		);
		render(<Home />);

		acceptConsent();
		const trigger = screen.getByRole("button", { name: "Privacy choices" });
		trigger.focus();
		requestConsentReview();

		const dialog = screen.getByRole("alertdialog", {
			name: /delete saved profiles/i,
		});
		const background = document.getElementById("page-background");
		expect(background?.hasAttribute("inert")).toBe(true);
		expect(background?.getAttribute("aria-hidden")).toBe("true");
		const confirmButton = screen.getByRole("button", {
			name: /delete profiles and change choice/i,
		});
		const cancelButton = screen.getByRole("button", { name: /keep profiles/i });
		expect(cancelButton).toBe(document.activeElement);

		fireEvent.keyDown(dialog, { key: "Tab" });
		expect(confirmButton).toBe(document.activeElement);
		fireEvent.keyDown(dialog, { key: "Tab" });
		expect(cancelButton).toBe(document.activeElement);

		fireEvent.keyDown(document, { key: "Escape" });
		expect(screen.queryByRole("alertdialog")).toBeNull();
		expect(background?.hasAttribute("inert")).toBe(false);
		expect(background?.getAttribute("aria-hidden")).toBeNull();
		expect(trigger).toBe(document.activeElement);
		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toContain("Seed");
	});

	it("reports a failed profile deletion during consent withdrawal", () => {
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile()]),
		);
		render(<Home />);

		acceptConsent();
		const setItem = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation(() => {
				throw new Error("quota exceeded");
			});
		requestConsentReview();
		confirmWithdrawal();

		const dialog = screen.getByRole("alertdialog", {
			name: /delete saved profiles/i,
		});
		expect(within(dialog).getByRole("alert").textContent).toMatch(/profiles/i);
		expect(
			screen.queryByRole("heading", { name: /your data, your choice/i }),
		).toBeNull();
		expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toContain(
			"accepted",
		);
		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toContain("Seed");
		setItem.mockRestore();
	});

	it("keeps consent and profiles when profile deletion fails", () => {
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile()]),
		);
		render(<Home />);

		acceptConsent();
		const originalSetItem = Storage.prototype.setItem;
		const setItem = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation((key, value) => {
				if (key === PROFILE_STORAGE_KEY) {
					throw new Error("quota exceeded");
				}
				originalSetItem.call(window.localStorage, key, value);
			});
		requestConsentReview();
		confirmWithdrawal();

		const dialog = screen.getByRole("alertdialog", {
			name: /delete saved profiles/i,
		});
		expect(within(dialog).getByRole("alert").textContent).toMatch(/profiles/i);
		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toContain("Seed");
		expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toContain(
			"accepted",
		);
		expect(
			screen.getByRole("button", { name: /start capture/i, hidden: true }),
		).toBeTruthy();
		setItem.mockRestore();
	});

	it("deletes profiles but keeps consent when consent cannot be cleared", () => {
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile()]),
		);
		render(<Home />);

		acceptConsent();
		const removeItem = vi
			.spyOn(Storage.prototype, "removeItem")
			.mockImplementation(() => {
				throw new Error("storage blocked");
			});
		requestConsentReview();
		confirmWithdrawal();

		const dialog = screen.getByRole("alertdialog", {
			name: /delete saved profiles/i,
		});
		expect(within(dialog).getByRole("alert").textContent).toMatch(/changed/i);
		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBe("[]");
		expect(window.localStorage.getItem(CONSENT_STORAGE_KEY)).toContain(
			"accepted",
		);
		expect(
			screen.getByRole("button", { name: /start capture/i, hidden: true }),
		).toBeTruthy();
		removeItem.mockRestore();
	});

	it("clears an active capture when consent is withdrawn", () => {
		render(<Home />);

		acceptConsent();
		fireEvent.click(screen.getByRole("button", { name: "Start capture" }));
		const area = screen.getByRole("textbox", { name: "Typing area" });
		fireEvent.change(area, { target: { value: "abc" } });
		fireEvent.keyDown(area, { key: "a" });
		fireEvent.keyUp(area, { key: "a" });
		expect(screen.getByRole("button", { name: "Analyze" })).toBeTruthy();

		requestConsentReview();
		confirmWithdrawal();
		acceptConsent();

		expect(screen.getByRole("button", { name: "Start capture" })).toBeTruthy();
		expect(screen.queryByRole("textbox", { name: "Typing area" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Analyze" })).toBeNull();
	});

	it("discards an in-flight analysis when consent is withdrawn", async () => {
		render(<Home />);

		acceptConsent();
		fireEvent.click(screen.getByRole("tab", { name: /enroll/i }));
		stubAnalysis();
		await typeAndAnalyze();
		await typeAndAnalyze();

		const deferred = stubDeferredAnalysis();
		fireEvent.click(screen.getByRole("button", { name: "Start over" }));
		const area = screen.getByRole("textbox", { name: "Typing area" });
		fireEvent.change(area, { target: { value: "abcdefghijklmnop" } });
		fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

		requestConsentReview();
		confirmWithdrawal();
		expect(deferred.signal?.aborted).toBe(true);
		acceptConsent();
		await act(async () => {
			deferred.resolve(successfulFetchResponse());
		});

		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBe("[]");
		expect(screen.queryByText(/saved to this browser/i)).toBeNull();
	});

	it("discards an in-flight analysis when the workspace mode changes", async () => {
		render(<Home />);

		acceptConsent();
		const deferred = stubDeferredAnalysis();
		fireEvent.click(screen.getByRole("button", { name: "Start capture" }));
		const area = screen.getByRole("textbox", { name: "Typing area" });
		fireEvent.change(area, { target: { value: "abcdefghijklmnop" } });
		fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

		fireEvent.click(screen.getByRole("tab", { name: /enroll/i }));
		expect(deferred.signal?.aborted).toBe(true);
		await act(async () => {
			deferred.resolve(successfulFetchResponse());
		});

		expect(screen.queryByText(/readout printed below/i)).toBeNull();
		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull();
	});

	it("discards an in-flight analysis when a new profile is started", async () => {
		render(<Home />);

		acceptConsent();
		fireEvent.click(screen.getByRole("tab", { name: /enroll/i }));
		stubAnalysis();
		await typeAndAnalyze();
		await typeAndAnalyze();

		const deferred = stubDeferredAnalysis();
		fireEvent.click(screen.getByRole("button", { name: "Start over" }));
		const area = screen.getByRole("textbox", { name: "Typing area" });
		fireEvent.change(area, { target: { value: "abcdefghijklmnop" } });
		fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

		fireEvent.click(screen.getByRole("button", { name: "New profile" }));
		expect(deferred.signal?.aborted).toBe(true);
		await act(async () => {
			deferred.resolve(successfulFetchResponse());
		});

		expect(window.localStorage.getItem(PROFILE_STORAGE_KEY)).toBeNull();
		expect(screen.queryByText(/saved to this browser/i)).toBeNull();
	});

	it("cancels in-flight analysis when consent storage cannot be cleared", async () => {
		render(<Home />);

		acceptConsent();
		const deferred = stubDeferredAnalysis();
		fireEvent.click(screen.getByRole("button", { name: "Start capture" }));
		const area = screen.getByRole("textbox", { name: "Typing area" });
		fireEvent.change(area, { target: { value: "abcdefghijklmnop" } });
		fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

		const removeItem = vi
			.spyOn(Storage.prototype, "removeItem")
			.mockImplementation(() => {
				throw new Error("storage blocked");
			});
		requestConsentReview();
		confirmWithdrawal();
		expect(deferred.signal?.aborted).toBe(true);
		expect(screen.getByRole("alert").textContent).toMatch(/changed/i);
		expect(
			screen.getByRole("button", { name: "Start capture", hidden: true }),
		).toBeTruthy();
		await act(async () => {
			deferred.resolve(successfulFetchResponse());
		});

		expect(screen.queryByText(/readout printed below/i)).toBeNull();
		removeItem.mockRestore();
	});

	it("declines data use and reopens the choice", () => {
		render(<Home />);

		fireEvent.click(screen.getByRole("button", { name: "No thanks" }));
		expect(
			screen.getByRole("heading", { name: /data use is off/i }),
		).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Change choice" }));
		expect(
			screen.getByRole("heading", { name: /your data, your choice/i }),
		).toBeTruthy();

		acceptConsent();
		expect(screen.getByRole("button", { name: /start capture/i })).toBeTruthy();
	});

	it("reports consent storage failures when reopening a declined choice", () => {
		render(<Home />);

		fireEvent.click(screen.getByRole("button", { name: "No thanks" }));
		const removeItem = vi
			.spyOn(Storage.prototype, "removeItem")
			.mockImplementation(() => {
				throw new Error("storage blocked");
			});
		fireEvent.click(screen.getByRole("button", { name: "Change choice" }));

		expect(screen.getByRole("alert").textContent).toMatch(/changed/i);
		expect(
			screen.getByRole("heading", { name: /data use is off/i }),
		).toBeTruthy();
		removeItem.mockRestore();
	});

	it("reports consent storage failures", () => {
		render(<Home />);
		const setItem = vi
			.spyOn(Storage.prototype, "setItem")
			.mockImplementation(() => {
				throw new Error("quota exceeded");
			});

		fireEvent.click(screen.getByRole("checkbox"));
		fireEvent.click(screen.getByRole("button", { name: "Allow data use" }));
		expect(screen.getByRole("alert").textContent).toMatch(/consent/i);
		setItem.mockRestore();
		fireEvent.click(screen.getByRole("button", { name: "Allow data use" }));
		fireEvent.click(screen.getByRole("button", { name: "Start capture" }));
		const area = screen.getByRole("textbox", { name: "Typing area" });
		fireEvent.change(area, { target: { value: "abc" } });

		const removeItem = vi
			.spyOn(Storage.prototype, "removeItem")
			.mockImplementation(() => {
				throw new Error("storage blocked");
			});
		requestConsentReview();
		confirmWithdrawal();
		const dialog = screen.getByRole("alertdialog", {
			name: /delete saved profiles/i,
		});
		expect(within(dialog).getByRole("alert").textContent).toMatch(/changed/i);
		expect(
			screen.queryByRole("textbox", { name: "Typing area", hidden: true }),
		).toBeNull();
		expect(
			screen.getByRole("button", { name: /start capture/i, hidden: true }),
		).toBeTruthy();
		expect(
			screen.queryByRole("heading", { name: /your data, your choice/i }),
		).toBeNull();
		removeItem.mockRestore();
	});

	it("exposes analyze, enroll, and verify from the start page after consent", () => {
		render(<Home />);

		acceptConsent();

		expect(
			screen.getByRole("tablist", { name: /workspace mode/i }),
		).toBeTruthy();
		expect(screen.getByRole("tab", { name: /analyze/i })).toBeTruthy();
		expect(screen.getByRole("tab", { name: /enroll/i })).toBeTruthy();
		expect(screen.getByRole("tab", { name: /verify/i })).toBeTruthy();

		fireEvent.click(screen.getByRole("tab", { name: /verify/i }));
		expect(
			screen.getByRole("heading", { name: /verify needs a profile/i }),
		).toBeTruthy();
	});

	it("prints a readout and exports the session JSON", async () => {
		stubAnalysis();
		stubDownload();
		render(<Home />);

		acceptConsent();
		await typeAndAnalyze();

		expect(
			screen.getByRole("button", { name: "Export session JSON" }),
		).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", { name: "Export session JSON" }),
		);
	});

	it("sends opaque key IDs instead of raw keys to the API", async () => {
		const fetchMock = stubAnalysis();
		render(<Home />);

		acceptConsent();
		await typeAndAnalyze();

		const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
		const body = JSON.parse(String(init.body)) as {
			events: Array<Record<string, unknown>>;
		};
		expect(body.events.length).toBeGreaterThan(0);
		expect(body.events.every((item) => !("key" in item))).toBe(true);
		expect(body.events.every((item) => typeof item.keyId === "string")).toBe(
			true,
		);
	});

	it("shows readable errors for failed analysis", async () => {
		render(<Home />);
		acceptConsent();
		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({
				ok: false,
				json: async () => ({ error: "Bad typing data" }),
			}),
		);

		await typeAndAnalyze();
		expect(screen.getByRole("alert").textContent).toContain("Bad typing data");

		vi.stubGlobal(
			"fetch",
			vi.fn().mockResolvedValue({ ok: false, json: async () => null }),
		);
		await typeAndAnalyze();
		expect(screen.getByRole("alert").textContent).toMatch(
			/server could not read/i,
		);
	});

	it("falls back when analysis fails without an Error", async () => {
		render(<Home />);
		acceptConsent();
		vi.stubGlobal("fetch", vi.fn().mockRejectedValue("boom"));

		await typeAndAnalyze();
		expect(screen.getByRole("alert").textContent).toMatch(/try again/i);
	});

	it("enrolls three samples, downloads the profile, and clears it on mode change", async () => {
		stubAnalysis();
		stubDownload();
		render(<Home />);

		acceptConsent();
		fireEvent.click(screen.getByRole("tab", { name: /enroll/i }));
		fireEvent.change(screen.getByLabelText("Saved in this browser only"), {
			target: { value: "Named profile" },
		});

		await typeAndAnalyze();
		expect(
			screen.getAllByText("Sample 1 of 3 captured.").length,
		).toBeGreaterThan(0);
		await typeAndAnalyze();
		expect(
			screen.getAllByText("Sample 2 of 3 captured.").length,
		).toBeGreaterThan(0);
		await typeAndAnalyze();

		expect(
			screen.getByRole("heading", { name: /named profile is saved/i }),
		).toBeTruthy();
		fireEvent.click(
			screen.getByRole("button", { name: "Download profile JSON" }),
		);

		fireEvent.click(screen.getByRole("tab", { name: /analyze/i }));
		expect(
			screen.queryByRole("button", { name: "Download profile JSON" }),
		).toBeNull();
	});

	it("verifies against a seeded profile and manages the vault", async () => {
		stubAnalysis();
		stubDownload();
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile()]),
		);
		render(<Home />);

		acceptConsent();
		fireEvent.click(screen.getByRole("tab", { name: /verify/i }));
		expect(screen.getByText("Comparing against")).toBeTruthy();
		expect(screen.getByRole("button", { name: "Use Seed" })).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Use Seed" }));
		expect(screen.getByText("Using Seed.")).toBeTruthy();
		await typeAndAnalyze();
		expect(
			screen.getByRole("img", { name: /gap distribution comparison/i }),
		).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Export Seed" }));
		fireEvent.click(screen.getByRole("button", { name: "Delete Seed" }));
		expect(screen.queryByRole("button", { name: "Use Seed" })).toBeNull();

		fireEvent.click(screen.getByRole("button", { name: "New profile" }));
		expect(
			screen.getByRole("heading", { name: "Name this profile" }),
		).toBeTruthy();

		fireEvent.change(screen.getByLabelText("Import profile file"), {
			target: {
				files: [new File(["{}"], "bad.json", { type: "application/json" })],
			},
		});
		await waitFor(() => expect(screen.getByRole("alert")).toBeTruthy());
	});

	it("clears the comparison when the active profile is deleted", async () => {
		stubAnalysis();
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile(), secondProfile()]),
		);
		render(<Home />);

		acceptConsent();
		fireEvent.click(screen.getByRole("tab", { name: /verify/i }));
		fireEvent.click(screen.getByRole("button", { name: "Use Seed" }));
		await typeAndAnalyze();
		expect(
			screen.getByRole("img", { name: /gap distribution comparison/i }),
		).toBeTruthy();

		fireEvent.click(screen.getByRole("button", { name: "Delete Seed" }));
		expect(
			screen.queryByRole("img", { name: /gap distribution comparison/i }),
		).toBeNull();
	});

	it("clears the comparison when a profile is imported", async () => {
		stubAnalysis();
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile()]),
		);
		render(<Home />);

		acceptConsent();
		fireEvent.click(screen.getByRole("tab", { name: /verify/i }));
		fireEvent.click(screen.getByRole("button", { name: "Use Seed" }));
		await typeAndAnalyze();
		expect(
			screen.getByRole("img", { name: /gap distribution comparison/i }),
		).toBeTruthy();

		fireEvent.change(screen.getByLabelText("Import profile file"), {
			target: {
				files: [
					new File([JSON.stringify(secondProfile())], "second.json", {
						type: "application/json",
					}),
				],
			},
		});
		await waitFor(() =>
			expect(screen.getByText("Imported Second.")).toBeTruthy(),
		);
		expect(
			screen.queryByRole("img", { name: /gap distribution comparison/i }),
		).toBeNull();
	});

	it("discards an analysis that finishes while a profile import is pending", async () => {
		stubAnalysis();
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile()]),
		);
		let resolveFileText: (value: string) => void = () => {};
		vi.spyOn(File.prototype, "text").mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveFileText = resolve;
				}),
		);
		render(<Home />);

		acceptConsent();
		fireEvent.click(screen.getByRole("tab", { name: /verify/i }));
		fireEvent.click(screen.getByRole("button", { name: "Use Seed" }));
		await typeAndAnalyze();
		expect(
			screen.getByRole("img", { name: /gap distribution comparison/i }),
		).toBeTruthy();

		fireEvent.change(screen.getByLabelText("Import profile file"), {
			target: {
				files: [
					new File(["pending"], "second.json", { type: "application/json" }),
				],
			},
		});
		await typeAndAnalyze();
		expect(
			screen.getByRole("img", { name: /gap distribution comparison/i }),
		).toBeTruthy();

		resolveFileText(JSON.stringify(secondProfile()));
		await waitFor(() =>
			expect(screen.getByText("Imported Second.")).toBeTruthy(),
		);
		expect(
			screen.queryByRole("img", { name: /gap distribution comparison/i }),
		).toBeNull();
	});

	it("keeps profile deletions made while an import is pending", async () => {
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile(), secondProfile()]),
		);
		let resolveFileText: (value: string) => void = () => {};
		vi.spyOn(File.prototype, "text").mockImplementation(
			() =>
				new Promise((resolve) => {
					resolveFileText = resolve;
				}),
		);
		render(<Home />);

		acceptConsent();
		fireEvent.change(screen.getByLabelText("Import profile file"), {
			target: {
				files: [
					new File(["pending"], "third.json", { type: "application/json" }),
				],
			},
		});
		fireEvent.click(screen.getByRole("button", { name: "Delete Second" }));
		expect(screen.queryByRole("button", { name: "Use Second" })).toBeNull();

		resolveFileText(JSON.stringify(thirdProfile()));
		await waitFor(() =>
			expect(screen.getByText("Imported Third.")).toBeTruthy(),
		);
		expect(screen.queryByRole("button", { name: "Use Second" })).toBeNull();
		expect(screen.getByRole("button", { name: "Use Third" })).toBeTruthy();
	});

	it("stops an active capture when selecting another profile", () => {
		window.localStorage.setItem(
			PROFILE_STORAGE_KEY,
			JSON.stringify([seededProfile(), secondProfile()]),
		);
		render(<Home />);

		acceptConsent();
		fireEvent.click(screen.getByRole("tab", { name: /verify/i }));
		fireEvent.click(screen.getByRole("button", { name: "Start capture" }));
		const area = screen.getByRole("textbox", { name: "Typing area" });
		fireEvent.change(area, { target: { value: "abc" } });
		fireEvent.keyDown(area, { key: "a" });
		fireEvent.keyUp(area, { key: "a" });

		fireEvent.click(screen.getByRole("button", { name: "Use Second" }));
		expect(screen.queryByRole("textbox", { name: "Typing area" })).toBeNull();
		expect(screen.queryByRole("button", { name: "Analyze" })).toBeNull();
		expect(screen.getByRole("button", { name: "Start capture" })).toBeTruthy();
	});

	it("starts the next enrollment sample at sample one after start over", async () => {
		stubAnalysis();
		render(<Home />);

		acceptConsent();
		fireEvent.click(screen.getByRole("tab", { name: /enroll/i }));
		await typeAndAnalyze();
		await typeAndAnalyze();
		await typeAndAnalyze();
		expect(
			screen.getByRole("heading", { name: /profile 1 is saved/i }),
		).toBeTruthy();

		await typeAndAnalyze();
		expect(screen.queryByText("Sample 3 of 3 captured.")).toBeNull();
		expect(
			screen.getAllByText("Sample 1 of 3 captured.").length,
		).toBeGreaterThan(0);
	});
});
