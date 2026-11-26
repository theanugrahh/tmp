import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SENTENCE, SENTENCE_PRESETS } from "@/lib/sentences";
import { SentencePicker } from "./SentencePicker";

const presetText = (label: string): string => {
	const preset = SENTENCE_PRESETS.find((item) => item.label === label);
	if (preset === undefined) {
		throw new Error(`Missing sentence preset: ${label}`);
	}
	return preset.text;
};

describe("SentencePicker", () => {
	afterEach(cleanup);

	it("selects a preset and accepts a custom sentence", () => {
		const onChange = vi.fn();
		render(<SentencePicker value={DEFAULT_SENTENCE} onChange={onChange} />);

		fireEvent.click(screen.getByRole("button", { name: "Rhythm" }));
		expect(onChange).toHaveBeenCalledWith(presetText("Rhythm"));

		fireEvent.change(screen.getByLabelText(/write your own/i), {
			target: { value: "Custom sentence." },
		});
		expect(onChange).toHaveBeenCalledWith("Custom sentence.");
	});

	it("marks the active preset as pressed", () => {
		render(
			<SentencePicker value={presetText("Hands")} onChange={() => undefined} />,
		);
		expect(
			screen
				.getByRole("button", { name: "Hands" })
				.getAttribute("aria-pressed"),
		).toBe("true");
	});
});
