interface TimelineChartProps {
	gaps: number[];
}

export function TimelineChart({ gaps }: TimelineChartProps) {
	if (gaps.length < 2) {
		return null;
	}
	const max = Math.max(...gaps);
	const min = Math.min(...gaps);
	const width = 640;
	const height = 140;
	const padX = 10;
	const padY = 14;
	const spanX = width - padX * 2;
	const spanY = height - padY * 2;

	const points = gaps
		.map((value, index) => {
			const x = padX + (index / (gaps.length - 1)) * spanX;
			const y = height - padY - (max > 0 ? (value / max) * spanY : 0);
			return `${x},${y}`;
		})
		.join(" ");
	const areaPoints = `${padX},${height - padY} ${points} ${width - padX},${height - padY}`;

	return (
		<section
			aria-labelledby="timeline-heading"
			className="border-t border-[var(--rule)] pt-4"
		>
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h3
					id="timeline-heading"
					className="font-display text-sm font-semibold text-[var(--ink)]"
				>
					Your rhythm, gap by gap
				</h3>
				<span className="font-readout text-xs tabular-nums text-[var(--ink-3)]">
					fastest {Math.round(min)} ms · slowest {Math.round(max)} ms
				</span>
			</div>
			<div className="mt-3">
				<svg
					viewBox={`0 0 ${width} ${height}`}
					className="h-auto w-full"
					role="img"
					aria-label={`Typing timeline with ${gaps.length} gaps`}
				>
					<line
						x1={padX}
						y1={height - padY}
						x2={width - padX}
						y2={height - padY}
						stroke="var(--rule-strong)"
						strokeWidth="1"
					/>
					<polygon points={areaPoints} fill="var(--accent-tint)" />
					<polyline
						points={points}
						fill="none"
						stroke="var(--accent)"
						strokeWidth="2"
						strokeLinejoin="round"
						strokeLinecap="round"
					/>
				</svg>
			</div>
		</section>
	);
}
