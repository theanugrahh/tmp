import type { KeyboardEvent as RKeyboardEvent } from "react";
import { useEffect, useRef, useState } from "react";

interface CapturePanelProps {
	capturing: boolean;
	count?: number;
	analyzing?: boolean;
	analyzed?: boolean;
	phaseLabel?: string;
	description?: string;
	progress?: string;
	target?: string;
	onKeyDown: (event: RKeyboardEvent) => void;
	onKeyUp: (event: RKeyboardEvent) => void;
	onStart: () => void;
	onAnalyze: () => void;
	onReset: () => void;
}

export function CapturePanel({
	capturing,
	count = 0,
	analyzing = false,
	analyzed = false,
	phaseLabel,
	description,
	progress,
	target,
	onKeyDown,
	onKeyUp,
	onStart,
	onAnalyze,
	onReset,
}: CapturePanelProps) {
	const areaRef = useRef<HTMLTextAreaElement>(null);
	const [text, setText] = useState("");
	const showArea = capturing || analyzing || analyzed;

	useEffect(() => {
		if (capturing) {
			setText("");
			areaRef.current?.focus();
		}
	}, [capturing]);

	const targetBlock =
		target !== undefined && target.length > 0 ? (
			<div className="mt-4 rounded-xl border border-[var(--rule)] bg-[var(--surface-2)] px-4 py-3">
				<p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
					Target sentence
				</p>
				<p className="mt-1 font-display text-sm font-bold text-[var(--ink)]">
					{target}
				</p>
			</div>
		) : null;

	if (!showArea) {
		return (
			<section className="card p-6 md:p-8">
				<h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--ink)]">
					{phaseLabel ?? "Start when you're ready."}
				</h2>
				<p className="mt-1.5 max-w-md text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
					{description ??
						"Press start and the typing area appears. Type a sentence, then analyze it. Timing is sent to this site's analysis endpoint; profiles stay in this browser."}
				</p>
				{targetBlock}
				<button
					type="button"
					onClick={onStart}
					className="btn btn-primary mt-5"
				>
					Start capture
				</button>
			</section>
		);
	}

	return (
		<section className="card p-6 md:p-8">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--ink)]">
					{analyzed ? (progress ?? "Captured.") : "Type something."}
				</h2>
				<span className="font-readout text-xs tabular-nums text-[var(--ink-3)]">
					{count} {count === 1 ? "key" : "keys"}
				</span>
			</div>
			<p className="mt-1.5 text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
				{analyzed
					? "Capture stopped. Start over for a fresh readout."
					: (description ??
						"A sentence, a word, or a repeated pattern — anything works.")}
			</p>
			{targetBlock}
			{analyzed ? (
				<section
					aria-label="Captured text"
					className="field mt-4 min-h-[190px] whitespace-pre-wrap px-5 py-4 text-base"
				>
					{text === "" ? "…" : text}
				</section>
			) : (
				<textarea
					ref={areaRef}
					aria-label="Typing area"
					placeholder="Type a sentence, a word, or a repeated pattern…"
					value={text}
					onChange={(event) => setText(event.target.value)}
					onKeyDown={onKeyDown}
					onKeyUp={onKeyUp}
					readOnly={analyzing}
					rows={6}
					spellCheck={false}
					autoCapitalize="off"
					autoCorrect="off"
					autoComplete="off"
					className="field focus-ring mt-4 min-h-[190px] w-full resize-y px-5 py-4 text-base"
				/>
			)}
			<div className="mt-4 flex flex-wrap items-center justify-between gap-3">
				<p className="text-[0.95rem] font-semibold text-[var(--ink-2)]">
					{analyzing
						? "Analyzing your typing…"
						: analyzed
							? "Readout printed below."
							: "Capturing. Analyze when you’re done."}
				</p>
				{analyzing ? (
					<button type="button" className="btn btn-primary" disabled>
						Analyzing…
					</button>
				) : analyzed ? (
					<button type="button" onClick={onReset} className="btn">
						Start over
					</button>
				) : (
					<button type="button" onClick={onAnalyze} className="btn btn-primary">
						Analyze
					</button>
				)}
			</div>
		</section>
	);
}
