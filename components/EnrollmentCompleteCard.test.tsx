import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createProfile } from "@/lib/profile";
import { EnrollmentCompleteCard } from "./EnrollmentCompleteCard";

describe("EnrollmentCompleteCard", () => {
	afterEach(cleanup);

	const profile = createProfile({
		name: "Morning session",
		sentence: "the quick brown fox",
		samples: [
			{
				medianGapMs: 120,
				cv: 0.3,
				entropyBits: 4.2,
				avgHoldMs: 90,
				backspaceRate: 0,
				histogram: new Array(48).fill(0),
			},
		],
		id: "profile-1",
		createdAt: "2026-01-01T00:00:00.000Z",
		salt: "test-salt",
	});

	it("offers an explicit profile file download after enrollment", () => {
		const onDownload = vi.fn();
		render(
			<EnrollmentCompleteCard
				profile={profile}
				onDownload={onDownload}
				onVerify={() => undefined}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: /download profile json/i }),
		);
		expect(onDownload).toHaveBeenCalledWith(profile);
	});

	it("offers to verify the enrolled profile", () => {
		const onVerify = vi.fn();
		render(
			<EnrollmentCompleteCard
				profile={profile}
				onDownload={() => undefined}
				onVerify={onVerify}
			/>,
		);

		fireEvent.click(
			screen.getByRole("button", { name: /verify this profile/i }),
		);
		expect(onVerify).toHaveBeenCalledWith(profile);
	});
});
