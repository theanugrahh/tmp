import { SENTENCE_PRESETS } from "@/lib/sentences";

interface SentencePickerProps {
	value: string;
	onChange: (sentence: string) => void;
	disabled?: boolean;
}

export function SentencePicker({
	value,
	onChange,
	disabled = false,
}: SentencePickerProps) {
	return (
		<div className="mb-5">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<p className="font-display text-xs font-extrabold tracking-[0.14em] text-[var(--ink-3)] uppercase">
					Practice sentence
				</p>
				<p className="text-xs font-semibold text-[var(--ink-3)]">
					Same words, fair comparison
				</p>
			</div>
			<fieldset className="mt-2 flex min-w-0 flex-wrap gap-2 border-0 p-0">
				<legend className="sr-only">Sentence presets</legend>
				{SENTENCE_PRESETS.map((preset) => (
					<button
						key={preset.id}
						type="button"
						disabled={disabled}
						aria-pressed={value === preset.text}
						onClick={() => onChange(preset.text)}
						className={`preset${value === preset.text ? " preset-active" : ""}`}
					>
						{preset.label}
					</button>
				))}
			</fieldset>
			<label
				className="mt-3 block text-xs font-semibold text-[var(--ink-3)]"
				htmlFor="sentence-input"
			>
				Or write your own
			</label>
			<input
				id="sentence-input"
				type="text"
				value={value}
				disabled={disabled}
				onChange={(event) => onChange(event.target.value)}
				className="focus-ring mt-1.5 w-full rounded-xl border border-[var(--rule-strong)] bg-[var(--surface-2)] px-4 py-2.5 font-display text-sm font-semibold text-[var(--ink)]"
			/>
		</div>
	);
}
