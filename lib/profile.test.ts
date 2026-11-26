import { describe, expect, it } from "vitest";
import { computeMetrics } from "./metrics";
import type { TypingProfile } from "./profile";
import {
	checksumFor,
	compareToProfile,
	createProfile,
	featureVector,
	histogramFrom,
	MAX_PROFILE_NAME_LENGTH,
	PROFILE_VERSION,
	parseProfile,
	SAMPLES_REQUIRED,
} from "./profile";
import type { TypingEvent } from "./types";

function metricsFrom(gaps: number[]) {
	const events: TypingEvent[] = [];
	let t = 0;
	for (const [index, gap] of gaps.entries()) {
		if (index === 0) {
			events.push({ type: "down", key: "a", t });
		}
		t += gap;
		events.push({ type: "down", key: `k${index}`, t });
	}
	return computeMetrics(events);
}

const RHYTHM = [90, 130, 180, 110, 160, 210, 120, 150, 190, 100, 170, 140];
const OTHER_RHYTHM = [
	300, 420, 260, 480, 340, 510, 380, 450, 290, 400, 520, 360,
];

function makeProfile(): TypingProfile {
	return createProfile({
		name: "Main",
		sentence: "A sentence.",
		samples: [featureVector(metricsFrom(RHYTHM))],
		id: "profile-1",
		createdAt: "2026-01-01T00:00:00.000Z",
		salt: "salt-1",
	});
}

function withChecksum(profile: TypingProfile): TypingProfile {
	return { ...profile, checksum: checksumFor(profile) };
}

function withHistogram(
	path: "samples" | "template",
	value: number,
): TypingProfile {
	const profile = makeProfile();
	const replaceBin = (bins: number[]) =>
		bins.map((bin, index) => (index === 0 ? value : bin));
	if (path === "samples") {
		return withChecksum({
			...profile,
			samples: profile.samples.map((sample, index) =>
				index === 0
					? { ...sample, histogram: replaceBin(sample.histogram) }
					: sample,
			),
		});
	}
	return withChecksum({
		...profile,
		template: {
			...profile.template,
			histogram: replaceBin(profile.template.histogram),
		},
	});
}

function withSpread(value: number): TypingProfile {
	const profile = makeProfile();
	return withChecksum({
		...profile,
		template: {
			...profile.template,
			medianGapMs: { ...profile.template.medianGapMs, spread: value },
		},
	});
}

describe("profile engine", () => {
	it("builds a normalized histogram over fixed 25 ms bins", () => {
		const bins = histogramFrom([10, 30, 55, 1200, 5000]);
		expect(bins).toHaveLength(48);
		expect(bins[0]).toBeCloseTo(1 / 5, 5);
		expect(bins[1]).toBeCloseTo(1 / 5, 5);
		expect(bins[47]).toBeCloseTo(2 / 5, 5);
	});

	it("creates a stable checksummed profile from feature vectors", () => {
		const samples = [RHYTHM, OTHER_RHYTHM, RHYTHM].map((gaps) =>
			featureVector(metricsFrom(gaps)),
		);
		const profile = createProfile({
			name: " Main rhythm ",
			sentence: "The quick brown fox jumps over the lazy dog.",
			samples,
			id: "profile-1",
			createdAt: "2026-01-01T00:00:00.000Z",
			salt: "salt-1",
		});
		expect(profile.version).toBe(PROFILE_VERSION);
		expect(profile.name).toBe("Main rhythm");
		expect(profile.samples).toHaveLength(SAMPLES_REQUIRED);
		expect(profile.checksum).toMatch(/^[0-9a-f]{8}$/);
		expect(parseProfile(profile)).toEqual(profile);
	});

	it("rejects changed files and unsupported versions", () => {
		const profile = createProfile({
			name: "Main",
			sentence: "A sentence.",
			samples: [featureVector(metricsFrom(RHYTHM))],
			id: "profile-1",
			createdAt: "2026-01-01T00:00:00.000Z",
			salt: "salt-1",
		});
		expect(() => parseProfile({ ...profile, name: "Someone else" })).toThrow(
			/checksum/i,
		);
		expect(() => parseProfile({ ...profile, version: 99 })).toThrow(/version/i);
	});

	it("scores a matching rhythm above a different rhythm", () => {
		const profile = createProfile({
			name: "Main",
			sentence: "A sentence.",
			samples: [RHYTHM, RHYTHM, RHYTHM].map((gaps) =>
				featureVector(metricsFrom(gaps)),
			),
			id: "profile-1",
			createdAt: "2026-01-01T00:00:00.000Z",
			salt: "salt-1",
		});
		const same = compareToProfile(metricsFrom(RHYTHM), profile);
		const different = compareToProfile(metricsFrom(OTHER_RHYTHM), profile);
		expect(same.score).toBeGreaterThan(different.score);
		expect(same.label).toBe("Strong match");
		expect(different.label).toBe("No match");
	});

	it("flags an under-enrolled profile as not enough data", () => {
		const profile = createProfile({
			name: "Partial",
			sentence: "A sentence.",
			samples: [featureVector(metricsFrom(RHYTHM))],
			id: "profile-1",
			createdAt: "2026-01-01T00:00:00.000Z",
			salt: "salt-1",
		});
		expect(compareToProfile(metricsFrom(RHYTHM), profile).label).toBe(
			"Not enough data",
		);
	});

	it("rejects profile names that are too long", () => {
		const longName = "x".repeat(MAX_PROFILE_NAME_LENGTH + 1);
		expect(() =>
			createProfile({
				name: longName,
				sentence: "A sentence.",
				samples: [featureVector(metricsFrom(RHYTHM))],
				id: "profile-1",
				createdAt: "2026-01-01T00:00:00.000Z",
				salt: "salt-1",
			}),
		).toThrow(/name/i);

		const profile = createProfile({
			name: "Main",
			sentence: "A sentence.",
			samples: [featureVector(metricsFrom(RHYTHM))],
			id: "profile-1",
			createdAt: "2026-01-01T00:00:00.000Z",
			salt: "salt-1",
		});
		expect(() => parseProfile({ ...profile, name: longName })).toThrow(/name/i);
	});

	it("rejects non-finite histogram bins even when checksum matches", () => {
		for (const invalid of [
			Number.NaN,
			Number.POSITIVE_INFINITY,
			Number.NEGATIVE_INFINITY,
		]) {
			expect(() => parseProfile(withHistogram("samples", invalid))).toThrow(
				/sample distribution/i,
			);
			expect(() => parseProfile(withHistogram("template", invalid))).toThrow(
				/template distribution/i,
			);
		}
	});

	it("rejects non-positive template spreads even when checksum matches", () => {
		for (const invalid of [0, -1]) {
			expect(() => parseProfile(withSpread(invalid))).toThrow(/spread/i);
		}
	});
});
