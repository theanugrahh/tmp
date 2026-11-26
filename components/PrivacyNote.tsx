interface PrivacyNoteProps {
	onReview?: () => void;
}

export function PrivacyNote({ onReview }: PrivacyNoteProps) {
	return (
		<div className="flex flex-wrap items-baseline gap-x-3 gap-y-2">
			<p className="text-sm font-semibold text-[var(--ink-3)]">
				<a
					href="/privacy"
					className="underline decoration-[var(--rule-strong)] underline-offset-4"
				>
					Privacy notice
				</a>{" "}
				·{" "}
				<a
					href="/terms"
					className="underline decoration-[var(--rule-strong)] underline-offset-4"
				>
					Terms
				</a>{" "}
				· Keystroke timing is sent for analysis; profiles stay in this browser.
			</p>
			{onReview !== undefined && (
				<button type="button" className="btn btn-ghost" onClick={onReview}>
					Privacy choices
				</button>
			)}
		</div>
	);
}
