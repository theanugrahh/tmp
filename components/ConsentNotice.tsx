import { useState } from "react";
import type { ConsentStatus } from "@/lib/consentStorage";

interface ConsentNoticeProps {
	status: ConsentStatus | null;
	error: string | null;
	onAccept: () => void;
	onDecline: () => void;
	onReview: () => void;
}

const CHECKBOX_LABEL =
	"I understand this demo sends keystroke timing to the analysis endpoint and stores profiles in this browser.";

export function ConsentNotice({
	status,
	error,
	onAccept,
	onDecline,
	onReview,
}: ConsentNoticeProps) {
	const [understood, setUnderstood] = useState(false);

	if (status === "accepted") return null;

	if (status === "declined") {
		return (
			<section className="card p-6 md:p-8" aria-labelledby="data-consent-title">
				<p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
					Privacy choice
				</p>
				<h2
					id="data-consent-title"
					className="mt-1 font-display text-xl font-extrabold tracking-tight text-[var(--ink)]"
				>
					Data use is off
				</h2>
				<p className="mt-2 max-w-2xl text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
					Capture, enrollment, verification, and exports are paused. Nothing new
					will be stored or sent until you change this choice.
				</p>
				{error !== null && (
					<p role="alert" className="alert mt-4">
						{error}
					</p>
				)}
				<div className="mt-5 flex flex-wrap items-center gap-3">
					<button type="button" className="btn btn-primary" onClick={onReview}>
						Change choice
					</button>
					<a href="/privacy" className="btn btn-ghost">
						Privacy notice
					</a>
					<a href="/terms" className="btn btn-ghost">
						Terms of use
					</a>
				</div>
			</section>
		);
	}

	return (
		<section className="card p-6 md:p-8" aria-labelledby="data-consent-title">
			<p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
				Before you type
			</p>
			<h2
				id="data-consent-title"
				className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[var(--ink)] md:text-3xl"
			>
				Your data, your choice
			</h2>
			<p className="mt-3 max-w-3xl text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
				TMP measures keystroke timing while you type. Analysis is sent to this
				site&apos;s endpoint, but the server does not save your events. Profiles
				and this choice stay in this browser until you export or delete them.
				You can withdraw consent at any time from the footer.
			</p>
			<ul className="mt-4 list-disc space-y-1 pl-5 text-sm leading-relaxed text-[var(--ink-2)]">
				<li>Keystroke timing is used for the readout and comparison.</li>
				<li>Profiles are kept in local storage on this device.</li>
				<li>Exported files are under your control after download.</li>
			</ul>
			<label className="mt-5 flex items-start gap-3 rounded-xl border border-[var(--rule)] bg-[var(--surface-2)] px-4 py-3 text-sm font-semibold leading-relaxed text-[var(--ink)]">
				<input
					type="checkbox"
					className="focus-ring mt-1 h-4 w-4"
					checked={understood}
					onChange={(event) => setUnderstood(event.target.checked)}
				/>
				<span>{CHECKBOX_LABEL}</span>
			</label>
			{error !== null && (
				<p role="alert" className="alert mt-4">
					{error}
				</p>
			)}
			<div className="mt-5 flex flex-wrap items-center gap-3">
				<button
					type="button"
					className="btn btn-primary"
					disabled={!understood}
					onClick={onAccept}
				>
					Allow data use
				</button>
				<button type="button" className="btn" onClick={onDecline}>
					No thanks
				</button>
				<a href="/privacy" className="btn btn-ghost">
					Privacy notice
				</a>
				<a href="/terms" className="btn btn-ghost">
					Terms of use
				</a>
			</div>
		</section>
	);
}
