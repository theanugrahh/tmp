import type { TypingMetrics } from "@/lib/types";

interface ReadoutCardProps {
	readout: string;
	metrics: TypingMetrics;
}

const TONE_CLASS: Record<"good" | "warn" | "neutral", string> = {
	good: "chip chip-good",
	warn: "chip chip-warn",
	neutral: "chip chip-accent",
};

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

export function ReadoutCard({ readout, metrics }: ReadoutCardProps) {
	const stats: Array<{ label: string; value: string; note?: string }> = [
		{
			label: "Entropy",
			value: `${round1(metrics.entropyBits).toFixed(1)} bits`,
		},
		{ label: "Rhythm", value: `${metrics.medianGapMs} ms` },
		{
			label: "Human-likeness",
			value: `${round1(metrics.humanScore).toFixed(1)}/5`,
			note: `95% CI ${round1(metrics.humanScoreCi95[0]).toFixed(1)}–${round1(metrics.humanScoreCi95[1]).toFixed(1)}`,
		},
		{ label: "Average hold", value: `${metrics.avgHoldMs} ms` },
		{
			label: "Backspace rate",
			value: `${Math.round(metrics.backspaceRate * 100)}%`,
		},
	];
	const result = metrics.verdict;

	return (
		<section aria-labelledby="readout-heading">
			<div className="flex flex-wrap items-baseline justify-between gap-3">
				<h2
					id="readout-heading"
					className="font-display text-3xl font-extrabold tracking-tight text-[var(--ink)]"
				>
					Readout
				</h2>
				<span className={TONE_CLASS[result.tone]}>{result.label}</span>
			</div>
			<p className="mt-3 font-readout text-[0.95rem] leading-relaxed text-[var(--ink)]">
				{readout}
			</p>
			<dl className="mt-6 divide-y divide-[var(--rule)] border-y border-[var(--rule)]">
				{stats.map((stat) => (
					<div
						key={stat.label}
						className="flex flex-wrap items-baseline justify-between gap-x-6 gap-y-1 py-3"
					>
						<dt className="font-display text-[0.85rem] text-[var(--ink-2)]">
							{stat.label}
							{stat.note !== undefined && (
								<span className="ml-2 font-readout text-xs tabular-nums text-[var(--ink-3)]">
									{" "}
									{stat.note}
								</span>
							)}
						</dt>
						<dd className="font-readout text-xl font-medium tabular-nums text-[var(--ink)]">
							{stat.value}
						</dd>
					</div>
				))}
			</dl>
			{metrics.pauseCount > 0 && (
				<p className="mt-3 text-xs text-[var(--ink-3)]">
					{metrics.pauseCount} pause{metrics.pauseCount === 1 ? "" : "s"} over
					1.2 s excluded from the gap statistics.
				</p>
			)}
			{metrics.flags.length > 0 && (
				<ul className="mt-4 flex flex-wrap gap-2">
					{metrics.flags.map((flag) => (
						<li key={flag} className="chip chip-warn">
							{flag}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
