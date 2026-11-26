import { useRef } from "react";
import type { TypingProfile } from "@/lib/profile";

interface ProfileLibraryProps {
	profiles: TypingProfile[];
	activeId: string | null;
	onSelect: (profile: TypingProfile) => void;
	onDelete: (id: string) => void;
	onExport: (profile: TypingProfile) => void;
	onImport: (file: File) => void;
	onNew: () => void;
}

function shortDate(value: string): string {
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return "Saved locally";
	return date.toLocaleDateString(undefined, {
		month: "short",
		day: "numeric",
	});
}

export function ProfileLibrary({
	profiles,
	activeId,
	onSelect,
	onDelete,
	onExport,
	onImport,
	onNew,
}: ProfileLibraryProps) {
	const fileRef = useRef<HTMLInputElement>(null);

	return (
		<section aria-labelledby="vault-heading" className="panel">
			<div className="flex items-baseline justify-between gap-3">
				<h2
					id="vault-heading"
					className="font-display text-xl font-extrabold tracking-tight text-[var(--ink)]"
				>
					Fingerprint vault
				</h2>
				<span className="font-readout text-xs tabular-nums text-[var(--ink-3)]">
					{String(profiles.length).padStart(2, "0")}
				</span>
			</div>
			<p className="mt-2 text-sm leading-relaxed text-[var(--ink-2)]">
				Profiles live in this browser. Export one as a file and carry it with
				you.
			</p>

			<div className="mt-5 flex flex-wrap gap-2">
				<button type="button" onClick={onNew} className="btn btn-primary">
					New profile
				</button>
				<button
					type="button"
					onClick={() => fileRef.current?.click()}
					className="btn"
				>
					Import profile
				</button>
				<input
					ref={fileRef}
					type="file"
					accept="application/json,.json"
					className="sr-only"
					aria-label="Import profile file"
					onChange={(event) => {
						const file = event.target.files?.[0];
						if (file !== undefined) onImport(file);
						event.target.value = "";
					}}
				/>
			</div>

			{profiles.length === 0 ? (
				<p className="mt-5 border-t border-[var(--rule)] pt-4 text-sm text-[var(--ink-3)]">
					No profiles yet. Enroll with three samples to create your first.
				</p>
			) : (
				<ul className="mt-5 space-y-2">
					{profiles.map((profile) => {
						const active = profile.id === activeId;
						return (
							<li
								key={profile.id}
								className={`profile-row${active ? " profile-row-active" : ""}`}
							>
								<button
									type="button"
									onClick={() => onSelect(profile)}
									className="min-w-0 flex-1 text-left"
									aria-label={`Use ${profile.name}`}
								>
									<span className="block truncate font-display text-sm font-extrabold text-[var(--ink)]">
										{profile.name}
									</span>
									<span className="mt-0.5 block font-readout text-[0.7rem] text-[var(--ink-3)]">
										{profile.samples.length} samples ·{" "}
										{shortDate(profile.createdAt)}
									</span>
								</button>
								<div className="flex items-center gap-1">
									<button
										type="button"
										onClick={() => onExport(profile)}
										className="icon-btn"
										aria-label={`Export ${profile.name}`}
									>
										↓
									</button>
									<button
										type="button"
										onClick={() => onDelete(profile.id)}
										className="icon-btn"
										aria-label={`Delete ${profile.name}`}
									>
										×
									</button>
								</div>
							</li>
						);
					})}
				</ul>
			)}
		</section>
	);
}
