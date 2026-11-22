import type { KeyboardEvent as RKeyboardEvent } from "react";

interface CapturePanelProps {
	capturing: boolean;
	onKeyDown: (event: RKeyboardEvent) => void;
	onKeyUp: (event: RKeyboardEvent) => void;
	onStart: () => void;
	onAnalyze: () => void;
}

export function CapturePanel({
	capturing,
	onKeyDown,
	onKeyUp,
	onStart,
	onAnalyze,
}: CapturePanelProps) {
	return (
		<section className="mt-16">
			<h2 className="text-balance font-display text-3xl font-semibold tracking-tight text-[var(--text)]">
				Type something
			</h2>
			<div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--bg-card)] p-6 shadow-sm">
				<textarea
					placeholder="Type a sentence, a word, or a repeated pattern…"
					onKeyDown={onKeyDown}
					onKeyUp={onKeyUp}
					rows={5}
					spellCheck={false}
					autoCapitalize="off"
					autoCorrect="off"
					autoComplete="off"
					className="w-full min-h-[180px] resize-none rounded-2xl border border-[var(--border)] bg-transparent px-5 py-6 font-readout text-base leading-relaxed text-[var(--text)] transition-colors duration-150 focus:border-[var(--accent)]"
				/>
				<div className="mt-5 flex flex-wrap gap-3">
					<button
						type="button"
						onClick={onStart}
						disabled={capturing}
						aria-pressed={capturing}
						className="rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] px-5 py-3.5 text-sm font-medium text-[var(--text)] shadow-sm transition-colors duration-150 hover:bg-[var(--readout-bg)] active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
					>
						{capturing ? "Capturing…" : "Start capture"}
					</button>
					<button
						type="button"
						onClick={onAnalyze}
						disabled={capturing}
						className="rounded-2xl border border-[var(--accent)] bg-[var(--accent)] px-5 py-3.5 text-sm font-medium text-white transition-colors duration-150 hover:brightness-110 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--accent)]"
					>
						Analyze
					</button>
				</div>
			</div>
		</section>
	);
}
