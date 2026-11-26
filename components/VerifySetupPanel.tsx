interface VerifySetupPanelProps {
	onEnroll: () => void;
}

export function VerifySetupPanel({ onEnroll }: VerifySetupPanelProps) {
	return (
		<section className="card p-6 md:p-8">
			<p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
				Verify mode
			</p>
			<h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[var(--ink)]">
				Verify needs a profile
			</h2>
			<p className="mt-3 max-w-2xl text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
				There is no saved profile in this browser yet. Enroll one with three
				samples, or use the vault to import a profile file. Verification stays
				unavailable until a profile exists because there is nothing fair to
				compare against.
			</p>
			<div className="mt-5 flex flex-wrap gap-3">
				<button type="button" className="btn btn-primary" onClick={onEnroll}>
					Enroll a profile first
				</button>
				<a href="/privacy" className="btn btn-ghost">
					Privacy notice
				</a>
			</div>
		</section>
	);
}
