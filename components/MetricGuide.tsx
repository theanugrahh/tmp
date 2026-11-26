import type { TypingMetrics } from "@/lib/types";

interface MetricGuideProps {
	metrics: TypingMetrics | null;
}

function round1(value: number): number {
	return Math.round(value * 10) / 10;
}

const GUIDES: Array<{
	title: string;
	text: string;
	value: (metrics: TypingMetrics) => string;
}> = [
	{
		title: "Entropy",
		text: "How spread out your gaps are, measured in bits over fixed 25 ms bins. Identical gaps give 0 bits; a wide spread gives more bits.",
		value: (metrics) => `${round1(metrics.entropyBits).toFixed(1)} bits`,
	},
	{
		title: "Rhythm",
		text: "Your median gap — the middle gap when every gap is sorted. Half of your gaps were shorter and half were longer.",
		value: (metrics) => `${metrics.medianGapMs} ms`,
	},
	{
		title: "Human-likeness",
		text: "The coefficient of variation of your gaps, mapped to 0–5. It reaches 5 when the spread hits 0.45 of the mean; the confidence interval says how sure that score is.",
		value: (metrics) => `${round1(metrics.humanScore).toFixed(1)}/5`,
	},
	{
		title: "Average hold",
		text: "The mean time from a key's down event to its up event. This needs key-up events, so it reads 0 when none were captured.",
		value: (metrics) => `${metrics.avgHoldMs} ms`,
	},
	{
		title: "Backspace rate",
		text: "Corrections ÷ non-modifier key presses. The high-edit-rate flag needs more than 15% and at least 20 key presses.",
		value: (metrics) => `${Math.round(metrics.backspaceRate * 100)}%`,
	},
];

export function MetricGuide({ metrics }: MetricGuideProps) {
	return (
		<section id="understand" className="mt-14 scroll-mt-8 font-display">
			<h2 className="font-display text-3xl font-extrabold tracking-tight text-[var(--ink)]">
				What the numbers mean
			</h2>
			<p className="mt-2 max-w-2xl text-[0.95rem] leading-relaxed text-[var(--ink-2)]">
				Every readout uses the same five signals. Here they are in plain
				language.
			</p>
			<dl className="mt-6 grid gap-x-10 sm:grid-cols-2">
				{GUIDES.map((guide) => (
					<div key={guide.title} className="border-t border-[var(--rule)] py-4">
						<div className="flex items-baseline justify-between gap-4">
							<dt className="font-display text-base font-semibold text-[var(--ink)]">
								{guide.title}
							</dt>
							{metrics !== null && (
								<dd className="font-readout text-sm font-medium tabular-nums text-[var(--accent)]">
									{guide.value(metrics)}
								</dd>
							)}
						</div>
						<p className="mt-1.5 text-[0.95rem] leading-relaxed text-[var(--ink-2)]">
							{guide.text}
						</p>
					</div>
				))}
			</dl>
		</section>
	);
}
