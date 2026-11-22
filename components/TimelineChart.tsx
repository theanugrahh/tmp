interface TimelineChartProps {
	intervals: number[];
}

export function TimelineChart({ intervals }: TimelineChartProps) {
	if (intervals.length < 2) {
		return null;
	}
	const max = Math.max(...intervals);
	const width = 640;
	const height = 120;
	const padding = 8;
	const span = width - padding * 2;

	const points = intervals
		.map((value, index) => {
			const x = padding + (index / (intervals.length - 1)) * span;
			const y =
				height -
				padding -
				(max > 0 ? (value / max) * (height - padding * 2) : 0);
			return `${x},${y}`;
		})
		.join(" ");

	return (
		<section className="mt-12">
			<h3 className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
				Timeline
			</h3>
			<svg
				viewBox={`0 0 ${width} ${height}`}
				preserveAspectRatio="none"
				className="mt-4 w-full"
				role="img"
				aria-label={`Typing timeline with ${intervals.length} intervals`}
			>
				<line
					x1={padding}
					y1={height - padding}
					x2={width - padding}
					y2={height - padding}
					stroke="var(--border)"
					strokeWidth="1"
					strokeLinecap="round"
				/>
				<polyline
					points={points}
					fill="none"
					stroke="var(--accent)"
					strokeWidth="1.5"
					strokeLinejoin="round"
					strokeLinecap="round"
				/>
			</svg>
		</section>
	);
}
