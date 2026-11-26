import type { TypingProfile } from "@/lib/profile";

interface EnrollmentCompleteCardProps {
	profile: TypingProfile;
	onDownload: (profile: TypingProfile) => void;
	onVerify: (profile: TypingProfile) => void;
}

export function EnrollmentCompleteCard({
	profile,
	onDownload,
	onVerify,
}: EnrollmentCompleteCardProps) {
	return (
		<section className="card" aria-labelledby="enrollment-complete-title">
			<div className="flex flex-wrap items-baseline justify-between gap-2">
				<div>
					<p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
						Enrollment complete
					</p>
					<h2
						id="enrollment-complete-title"
						className="mt-1 font-display text-xl font-extrabold tracking-tight text-[var(--ink)]"
					>
						{profile.name} is saved
					</h2>
				</div>
				<p className="font-readout text-xs tabular-nums text-[var(--ink-3)]">
					{profile.samples.length} samples
				</p>
			</div>
			<p className="mt-3 max-w-2xl text-sm font-semibold leading-relaxed text-[var(--ink-2)]">
				Download the profile file now, or verify this profile with a fresh
				sample. The file is yours to keep; nothing is uploaded.
			</p>
			<div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--rule)] pt-5">
				<button
					type="button"
					className="btn btn-primary"
					onClick={() => onDownload(profile)}
				>
					Download profile JSON
				</button>
				<button type="button" className="btn" onClick={() => onVerify(profile)}>
					Verify this profile
				</button>
			</div>
		</section>
	);
}
