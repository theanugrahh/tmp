import type { Comparison } from "@/lib/profile";

interface ComparisonCardProps {
	comparison: Comparison;
	baseline: number[];
	observed: number[];
	sentence: string;
}

const WIDTH = 640;
const HEIGHT = 160;
const PAD_X = 8;
const PAD_Y = 12;

function linePoints(values: number[], max: number): string {
	const spanX = WIDTH - PAD_X * 2;
	const spanY = HEIGHT - PAD_Y * 2;
	return values
		.map((value, index) => {
			const x = PAD_X + (index / Math.max(values.length - 1, 1)) * spanX;
			const y = HEIGHT - PAD_Y - (max > 0 ? (value / max) * spanY * 0.92 : 0);
			return `${x.toFixed(1)},${y.toFixed(1)}`;
		})
		.join(" ");
}

export function ComparisonCard({
	comparison,
	baseline,
	observed,
	sentence,
}: ComparisonCardProps) {
	const max = Math.max(...baseline, ...observed, 0.01);
	const baselinePoints = linePoints(baseline, max);
	const observedPoints = linePoints(observed, max);
	const areaPoints = `${PAD_X},${HEIGHT - PAD_Y} ${observedPoints} ${WIDTH - PAD_X},${HEIGHT - PAD_Y}`;

	return (
		<section aria-labelledby="match-heading" className="mt-12">
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<p className="font-display text-xs font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
						Fingerprint check
					</p>
					<h2
						id="match-heading"
						className="mt-1 font-display text-3xl font-extrabold tracking-tight text-[var(--ink)]"
					>
						Does this look like you?
					</h2>
				</div>
				<div className="flex items-baseline gap-1">
					<span className="font-display text-6xl font-extrabold leading-none tracking-tighter text-[var(--ink)]">
						{comparison.score}
					</span>
					<span className="font-readout text-sm text-[var(--ink-3)]">/100</span>
				</div>
			</div>
			<p className="mt-3 max-w-2xl font-readout text-sm leading-relaxed text-[var(--ink-2)]">
				{comparison.explanation}
			</p>
			<div className="mt-4 flex flex-wrap items-center gap-3">
				<span
					className={`chip ${
						comparison.tone === "good"
							? "chip-good"
							: comparison.tone === "warn"
								? "chip-warn"
								: "chip-accent"
					}`}
				>
					{comparison.label}
				</span>
				<span className="text-xs font-semibold text-[var(--ink-3)]">
					{comparison.closeCount} of {comparison.deltas.length} signals close
				</span>
			</div>

			<div className="mt-6 border-t border-[var(--rule)] pt-5">
				<div className="flex flex-wrap items-baseline justify-between gap-2">
					<h3 className="font-display text-sm font-extrabold text-[var(--ink)]">
						Gap distribution
					</h3>
					<p className="font-readout text-xs text-[var(--ink-3)]">
						{sentence.length > 64 ? `${sentence.slice(0, 64)}…` : sentence}
					</p>
				</div>
				<svg
					viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
					className="mt-3 h-auto w-full"
					role="img"
					aria-label={`Gap distribution comparison: saved profile versus this run, ${comparison.score} out of 100`}
				>
					<line
						x1={PAD_X}
						y1={HEIGHT - PAD_Y}
						x2={WIDTH - PAD_X}
						y2={HEIGHT - PAD_Y}
						stroke="var(--rule-strong)"
						strokeWidth="1"
					/>
					<polygon points={areaPoints} fill="var(--accent-tint)" />
					<polyline
						points={baselinePoints}
						fill="none"
						stroke="var(--ink-3)"
						strokeWidth="2"
						strokeDasharray="5 5"
						strokeLinejoin="round"
					/>
					<polyline
						points={observedPoints}
						fill="none"
						stroke="var(--accent)"
						strokeWidth="2.5"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				</svg>
				<div className="mt-2 flex flex-wrap gap-4 text-xs font-semibold text-[var(--ink-2)]">
					<span className="inline-flex items-center gap-2">
						<span className="h-0.5 w-5 bg-[var(--accent)]" /> This run
					</span>
					<span className="inline-flex items-center gap-2">
						<span className="h-0.5 w-5 bg-[var(--ink-3)]" /> Saved profile
					</span>
				</div>
			</div>

			<dl className="mt-6 grid gap-x-8 sm:grid-cols-2">
				{comparison.deltas.map((delta) => (
					<div key={delta.key} className="border-t border-[var(--rule)] py-3">
						<div className="flex items-baseline justify-between gap-3">
							<dt className="font-display text-sm font-bold text-[var(--ink)]">
								{delta.label}
							</dt>
							<dd className="font-readout text-xs tabular-nums text-[var(--ink-2)]">
								{delta.observedText}{" "}
								<span className="text-[var(--ink-3)]">
									/ {delta.expectedText}
								</span>
							</dd>
						</div>
						<div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--paper-2)]">
							<div
								className="h-full rounded-full bg-[var(--accent)]"
								style={{ width: `${Math.max(2, delta.deviation * 100)}%` }}
							/>
						</div>
					</div>
				))}
			</dl>
		</section>
	);
}
