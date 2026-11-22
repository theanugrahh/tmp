import type { TypingMetrics } from "@/lib/types";

interface ReadoutCardProps {
	readout: string;
	metrics: TypingMetrics;
}

interface StatProps {
	label: string;
	value: string;
}

function Stat({ label, value }: StatProps) {
	return (
		<div className="rounded-2xl border border-[var(--readout-border)] bg-[var(--readout-bg)] p-4">
			<dt className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
				{label}
			</dt>
			<dd
				className="mt-2 font-readout text-2xl font-semibold tabular-nums text-[var(--text)]"
				style={{ fontVariantNumeric: "tabular-nums" }}
			>
				{value}
			</dd>
		</div>
	);
}

export function ReadoutCard({ readout, metrics }: ReadoutCardProps) {
	const stats: Array<{ label: string; value: string }> = [
		{ label: "Entropy", value: `${metrics.entropy}/5` },
		{ label: "Rhythm", value: `${metrics.regularity}/5` },
		{ label: "Human-likeness", value: `${metrics.humanScore}/5` },
		{ label: "Average hold", value: `${Math.round(metrics.avgHoldMs)} ms` },
		{
			label: "Backspace rate",
			value: `${Math.round(metrics.backspaceRate * 100)}%`,
		},
	];

	return (
		<section className="mt-10">
			<h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
				Readout
			</h3>
			<p className="mt-4 font-readout text-base leading-relaxed text-[var(--text)]">
				{readout}
			</p>
			<dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
				{stats.map((stat) => (
					<Stat key={stat.label} label={stat.label} value={stat.value} />
				))}
			</dl>
			{metrics.flags.length > 0 && (
				<ul className="mt-4 flex flex-wrap gap-2">
					{metrics.flags.map((flag) => (
						<li
							key={flag}
							className="rounded-full border border-[var(--readout-border)] bg-[var(--readout-bg)] px-3 py-1 text-xs font-medium uppercase tracking-wide text-[var(--accent)]"
						>
							{flag}
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
