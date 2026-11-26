"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CapturePanel } from "@/components/CapturePanel";
import { ComparisonCard } from "@/components/ComparisonCard";
import { ConsentNotice } from "@/components/ConsentNotice";
import { EnrollmentCompleteCard } from "@/components/EnrollmentCompleteCard";
import { MetricGuide } from "@/components/MetricGuide";
import { ModeSwitch, type WorkspaceMode } from "@/components/ModeSwitch";
import { PrivacyNote } from "@/components/PrivacyNote";
import { ProfileLibrary } from "@/components/ProfileLibrary";
import { ReadoutCard } from "@/components/ReadoutCard";
import { SentencePicker } from "@/components/SentencePicker";
import { SiteHeader } from "@/components/SiteHeader";
import { TimelineChart } from "@/components/TimelineChart";
import { VerifySetupPanel } from "@/components/VerifySetupPanel";
import { useTypingCapture } from "@/hooks/useTypingCapture";
import { toAnalyzeEvents } from "@/lib/analyzeEvents";
import {
	type ConsentStatus,
	clearConsent,
	loadConsent,
	saveConsent,
} from "@/lib/consentStorage";
import {
	type Comparison,
	compareToProfile,
	createProfile,
	type FeatureVector,
	featureVector,
	MAX_PROFILE_NAME_LENGTH,
	SAMPLES_REQUIRED,
	type TypingProfile,
} from "@/lib/profile";
import {
	clearProfiles,
	exportProfileFile,
	importProfileFile,
	loadProfiles,
	removeProfile,
	upsertProfile,
} from "@/lib/profileStorage";
import { DEFAULT_SENTENCE } from "@/lib/sentences";
import { downloadSession } from "@/lib/session";
import type { TypingEvent, TypingMetrics } from "@/lib/types";

export default function Page() {
	const { capturing, count, start, stop, handleKeyDown, handleKeyUp } =
		useTypingCapture();
	const [mode, setMode] = useState<WorkspaceMode>("analyze");
	const [profiles, setProfiles] = useState<TypingProfile[]>([]);
	const [activeId, setActiveId] = useState<string | null>(null);
	const [sentence, setSentence] = useState(DEFAULT_SENTENCE);
	const [profileName, setProfileName] = useState("");
	const [samples, setSamples] = useState<FeatureVector[]>([]);
	const [sampleNumber, setSampleNumber] = useState(1);
	const [metrics, setMetrics] = useState<TypingMetrics | null>(null);
	const [readout, setReadout] = useState<string | null>(null);
	const [lastEvents, setLastEvents] = useState<TypingEvent[]>([]);
	const [comparison, setComparison] = useState<Comparison | null>(null);
	const [notice, setNotice] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [analyzing, setAnalyzing] = useState(false);
	const [consent, setConsent] = useState<ConsentStatus | null>(null);
	const [consentError, setConsentError] = useState<string | null>(null);
	const [withdrawConfirming, setWithdrawConfirming] = useState(false);
	const [withdrawError, setWithdrawError] = useState<string | null>(null);
	const [lastEnrolledProfile, setLastEnrolledProfile] =
		useState<TypingProfile | null>(null);
	const analysisRef = useRef<AbortController | null>(null);
	const requestGenerationRef = useRef(0);
	const withdrawDialogRef = useRef<HTMLElement | null>(null);
	const withdrawCancelRef = useRef<HTMLButtonElement | null>(null);

	const cancelAnalysis = useCallback(() => {
		requestGenerationRef.current += 1;
		analysisRef.current?.abort();
		analysisRef.current = null;
		setAnalyzing(false);
	}, []);

	useEffect(() => {
		if (!withdrawConfirming) return;
		const previouslyFocused = document.activeElement as HTMLElement | null;
		withdrawCancelRef.current?.focus();
		const handleKeyDown = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				event.preventDefault();
				setWithdrawError(null);
				setWithdrawConfirming(false);
				return;
			}
			if (event.key !== "Tab") return;
			const focusable = Array.from(
				withdrawDialogRef.current?.querySelectorAll<HTMLElement>(
					'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
				) ?? [],
			);
			if (focusable.length === 0) return;
			event.preventDefault();
			const currentIndex = focusable.indexOf(
				document.activeElement as HTMLElement,
			);
			const nextIndex =
				(currentIndex + (event.shiftKey ? -1 : 1) + focusable.length) %
				focusable.length;
			focusable[nextIndex]?.focus();
		};
		document.addEventListener("keydown", handleKeyDown);
		return () => {
			document.removeEventListener("keydown", handleKeyDown);
			previouslyFocused?.focus();
		};
	}, [withdrawConfirming]);

	useEffect(() => {
		try {
			const loaded = loadProfiles();
			setProfiles(loaded);
			setActiveId(loaded[0]?.id ?? null);
		} catch (caught) {
			setProfiles([]);
			setActiveId(null);
			setError(
				caught instanceof Error
					? caught.message
					: "Stored profiles could not be loaded in this browser.",
			);
		}
		setConsent(loadConsent()?.status ?? null);
		return cancelAnalysis;
	}, [cancelAnalysis]);

	const activeProfile =
		profiles.find((profile) => profile.id === activeId) ?? profiles[0] ?? null;
	const analyzed = metrics !== null && !capturing && !analyzing;
	const sampleCount = Math.min(samples.length, SAMPLES_REQUIRED);

	const clearResults = useCallback(() => {
		setMetrics(null);
		setReadout(null);
		setComparison(null);
		setNotice(null);
		setError(null);
	}, []);

	const startCapture = useCallback(() => {
		clearResults();
		if (mode === "enroll") {
			setSampleNumber(Math.min(samples.length + 1, SAMPLES_REQUIRED));
		}
		start();
	}, [clearResults, mode, samples.length, start]);

	const resetCapture = useCallback(() => {
		clearResults();
		start();
	}, [clearResults, start]);

	const acceptDataUse = useCallback(() => {
		if (!saveConsent("accepted")) {
			setConsentError("Consent could not be saved in this browser.");
			return;
		}
		setConsentError(null);
		setWithdrawError(null);
		setConsent("accepted");
	}, []);

	const declineDataUse = useCallback(() => {
		if (!saveConsent("declined")) {
			setConsentError("Consent could not be saved in this browser.");
			return;
		}
		setConsentError(null);
		setWithdrawError(null);
		setConsent("declined");
		setWithdrawConfirming(false);
	}, []);

	const reviewDataUse = useCallback(() => {
		cancelAnalysis();
		if (!clearConsent()) {
			setError(null);
			setConsentError("Consent could not be changed in this browser.");
			return;
		}
		setWithdrawConfirming(false);
		stop();
		clearResults();
		setLastEvents([]);
		setLastEnrolledProfile(null);
		setSamples([]);
		setSampleNumber(1);
		setConsentError(null);
		setWithdrawError(null);
		setConsent(null);
	}, [cancelAnalysis, clearResults, stop]);

	const requestDataUseReview = useCallback(() => {
		if (consent !== "accepted") {
			reviewDataUse();
			return;
		}
		setWithdrawError(null);
		setWithdrawConfirming(true);
	}, [consent, reviewDataUse]);

	const confirmDataUseWithdrawal = useCallback(() => {
		cancelAnalysis();
		stop();
		let nextProfiles: TypingProfile[];
		try {
			nextProfiles = clearProfiles();
		} catch (caught) {
			setWithdrawError(
				caught instanceof Error
					? caught.message
					: "Profiles could not be deleted in this browser.",
			);
			return;
		}
		clearResults();
		setProfiles(nextProfiles);
		setActiveId(null);
		setLastEvents([]);
		setLastEnrolledProfile(null);
		setSamples([]);
		setSampleNumber(1);
		if (!clearConsent()) {
			setWithdrawError(
				"Profiles were deleted, but consent could not be changed in this browser. Close this dialog and try again.",
			);
			return;
		}
		setConsentError(null);
		setWithdrawError(null);
		setConsent(null);
		setWithdrawConfirming(false);
	}, [cancelAnalysis, clearResults, stop]);

	const changeMode = useCallback(
		(next: WorkspaceMode) => {
			cancelAnalysis();
			stop();
			clearResults();
			setLastEnrolledProfile(null);
			setSamples([]);
			setSampleNumber(1);
			setMode(next);
			if (next === "verify" && activeId === null && profiles[0] !== undefined) {
				setActiveId(profiles[0].id);
			}
		},
		[activeId, cancelAnalysis, clearResults, profiles, stop],
	);

	const analyzeSample = useCallback(async () => {
		const captured = stop();
		clearResults();
		setLastEvents(captured);
		setAnalyzing(true);
		const requestGeneration = ++requestGenerationRef.current;
		const controller = new AbortController();
		analysisRef.current = controller;
		try {
			const response = await fetch("/api/analyze", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ events: toAnalyzeEvents(captured) }),
				signal: controller.signal,
			});
			if (requestGeneration !== requestGenerationRef.current) {
				return;
			}
			if (!response.ok) {
				const body = (await response.json().catch(() => null)) as {
					error?: string;
				} | null;
				throw new Error(
					body?.error ?? "The server could not read this typing pattern.",
				);
			}
			const data = (await response.json()) as {
				metrics: TypingMetrics;
				readout: string;
			};
			if (requestGeneration !== requestGenerationRef.current) {
				return;
			}
			setMetrics(data.metrics);
			setReadout(data.readout);

			if (mode === "enroll") {
				const nextSamples = [...samples, featureVector(data.metrics)];
				setSamples(nextSamples);
				if (nextSamples.length >= SAMPLES_REQUIRED) {
					const profile = createProfile({
						name: profileName.trim() || `Profile ${profiles.length + 1}`,
						sentence,
						samples: nextSamples,
					});
					setProfiles(upsertProfile(profiles, profile));
					setActiveId(profile.id);
					setSamples([]);
					setLastEnrolledProfile(profile);
					setNotice(`${profile.name} saved to this browser.`);
				} else {
					setNotice(
						`Sample ${nextSamples.length} of ${SAMPLES_REQUIRED} captured.`,
					);
				}
				return;
			}

			if (mode === "verify") {
				const profile =
					profiles.find((item) => item.id === activeId) ?? profiles[0];
				if (profile === undefined) {
					throw new Error("Enroll a profile before verifying.");
				}
				setComparison(compareToProfile(data.metrics, profile));
				setNotice(`Compared with ${profile.name}.`);
				return;
			}

			setNotice("Readout printed below.");
		} catch (caught) {
			if (requestGeneration !== requestGenerationRef.current) {
				return;
			}
			setError(
				caught instanceof Error
					? caught.message
					: "Something went wrong — try again.",
			);
		} finally {
			if (requestGeneration === requestGenerationRef.current) {
				setAnalyzing(false);
				analysisRef.current = null;
			}
		}
	}, [
		activeId,
		clearResults,
		mode,
		profileName,
		profiles,
		samples,
		sentence,
		stop,
	]);

	const selectProfile = useCallback(
		(profile: TypingProfile) => {
			cancelAnalysis();
			stop();
			clearResults();
			setActiveId(profile.id);
			setSentence(profile.sentence);
			setNotice(`Using ${profile.name}.`);
		},
		[cancelAnalysis, clearResults, stop],
	);

	const deleteProfile = useCallback(
		(id: string) => {
			cancelAnalysis();
			stop();
			clearResults();
			try {
				const next = removeProfile(profiles, id);
				setProfiles(next);
				if (activeId === id) setActiveId(next[0]?.id ?? null);
				if (lastEnrolledProfile?.id === id) setLastEnrolledProfile(null);
				setError(null);
			} catch (caught) {
				setError(
					caught instanceof Error
						? caught.message
						: "That profile could not be removed.",
				);
			}
		},
		[
			activeId,
			cancelAnalysis,
			clearResults,
			lastEnrolledProfile?.id,
			profiles,
			stop,
		],
	);

	const importProfile = useCallback(
		async (file: File) => {
			cancelAnalysis();
			stop();
			clearResults();
			try {
				const profile = await importProfileFile(file);
				cancelAnalysis();
				stop();
				clearResults();
				const actualProfiles = loadProfiles();
				const next = upsertProfile(actualProfiles, profile);
				setProfiles(next);
				setActiveId(profile.id);
				setSentence(profile.sentence);
				setLastEnrolledProfile(null);
				setError(null);
				setNotice(`Imported ${profile.name}.`);
			} catch (caught) {
				cancelAnalysis();
				stop();
				clearResults();
				setError(
					caught instanceof Error
						? caught.message
						: "That file could not be imported.",
				);
			}
		},
		[cancelAnalysis, clearResults, stop],
	);

	const newProfile = useCallback(() => {
		cancelAnalysis();
		stop();
		clearResults();
		setAnalyzing(false);
		setMode("enroll");
		setSamples([]);
		setSampleNumber(1);
		setProfileName("");
		setActiveId(null);
		setLastEnrolledProfile(null);
	}, [cancelAnalysis, clearResults, stop]);

	const phaseLabel =
		mode === "enroll"
			? "Enroll with three samples."
			: mode === "verify"
				? "Verify against a saved profile."
				: undefined;
	const description =
		mode === "enroll"
			? "Type the same sentence three times. TMP builds a template from the rhythm of all three samples."
			: mode === "verify"
				? "Type the target sentence again and compare this run with the selected local profile."
				: undefined;
	const progress =
		analyzed && mode === "enroll"
			? `Sample ${sampleNumber} of ${SAMPLES_REQUIRED} captured.`
			: analyzed && mode === "verify"
				? "Comparison printed below."
				: undefined;

	return (
		<main id="top" className="pb-16">
			<div
				id="page-background"
				aria-hidden={withdrawConfirming || undefined}
				inert={withdrawConfirming || undefined}
			>
				<SiteHeader />

				<div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 xl:px-12">
					<section className="pt-2 md:pt-6">
						<h1 className="max-w-5xl font-display text-4xl font-extrabold leading-[1.02] tracking-[-0.045em] text-[var(--ink)] sm:text-5xl lg:text-6xl xl:text-7xl">
							Type once. Save the rhythm.{" "}
							<em className="italic text-[var(--accent)]">Verify</em> it later.
						</h1>
						<p className="mt-5 max-w-3xl text-lg font-semibold leading-relaxed text-[var(--ink-2)] md:text-xl">
							TMP turns keystroke timing into a readable profile you control —
							stored locally, exportable as a file, and ready for a demo
							comparison.
						</p>
					</section>

					<ModeSwitch mode={mode} onChange={changeMode} />

					{consent === "accepted" ? (
						<div
							id="workspace-panel"
							role="tabpanel"
							aria-labelledby={`mode-tab-${mode}`}
							className="mt-6 grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start"
						>
							<div className="min-w-0 space-y-6">
								{mode === "verify" && profiles.length === 0 ? (
									<VerifySetupPanel onEnroll={() => changeMode("enroll")} />
								) : (
									<>
										<SentencePicker
											value={sentence}
											onChange={setSentence}
											disabled={capturing || analyzing}
										/>

										<CapturePanel
											capturing={capturing}
											count={count}
											analyzing={analyzing}
											analyzed={analyzed}
											phaseLabel={phaseLabel}
											description={description}
											progress={progress}
											target={sentence}
											onKeyDown={handleKeyDown}
											onKeyUp={handleKeyUp}
											onStart={startCapture}
											onAnalyze={analyzeSample}
											onReset={resetCapture}
										/>
									</>
								)}

								{error !== null && (
									<p role="alert" className="alert">
										{error}
									</p>
								)}

								{notice !== null && (
									<p role="status" className="chip chip-good">
										{notice}
									</p>
								)}

								{metrics !== null && readout !== null && (
									<div className="card">
										<p className="sr-only" role="status">
											{readout}
										</p>
										<ReadoutCard metrics={metrics} readout={readout} />
										<div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule)] pt-5">
											<p className="text-sm font-semibold text-[var(--ink-2)]">
												Keep the raw keystrokes with this readout.
											</p>
											<button
												type="button"
												className="btn"
												onClick={() =>
													downloadSession(lastEvents, metrics, sentence)
												}
											>
												Export session JSON
											</button>
										</div>
										<div className="mt-5">
											<TimelineChart gaps={metrics.gaps} />
										</div>
									</div>
								)}

								{comparison !== null && activeProfile !== null && (
									<div className="card">
										<ComparisonCard
											comparison={comparison}
											baseline={activeProfile.template.histogram}
											observed={metrics === null ? [] : metrics.gaps}
											sentence={sentence}
										/>
									</div>
								)}

								{mode === "enroll" && lastEnrolledProfile !== null && (
									<EnrollmentCompleteCard
										profile={lastEnrolledProfile}
										onDownload={(profile) => exportProfileFile(profile)}
										onVerify={(profile) => {
											changeMode("verify");
											setActiveId(profile.id);
										}}
									/>
								)}
							</div>

							<aside className="min-w-0 space-y-5">
								{mode === "enroll" && (
									<section className="panel">
										<p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
											New fingerprint
										</p>
										<h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-[var(--ink)]">
											Name this profile
										</h2>
										<label
											htmlFor="profile-name"
											className="mt-4 block text-xs font-bold text-[var(--ink-2)]"
										>
											Saved in this browser only
										</label>
										<input
											id="profile-name"
											type="text"
											value={profileName}
											maxLength={MAX_PROFILE_NAME_LENGTH}
											onChange={(event) => setProfileName(event.target.value)}
											placeholder={`Profile ${profiles.length + 1}`}
											className="focus-ring mt-1.5 w-full rounded-xl border border-[var(--rule-strong)] bg-[var(--surface-2)] px-4 py-2.5 font-display text-sm font-bold text-[var(--ink)]"
										/>
										<p className="mt-4 font-readout text-xs tabular-nums text-[var(--ink-3)]">
											{sampleCount} of {SAMPLES_REQUIRED} samples ready
										</p>
									</section>
								)}

								{mode === "verify" && activeProfile !== null && (
									<section className="panel">
										<p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
											Comparing against
										</p>
										<h2 className="mt-1 font-display text-xl font-extrabold tracking-tight text-[var(--ink)]">
											{activeProfile.name}
										</h2>
										<p className="mt-3 text-sm font-semibold leading-relaxed text-[var(--ink-2)]">
											{activeProfile.sentence}
										</p>
										<p className="mt-4 font-readout text-xs tabular-nums text-[var(--ink-3)]">
											{activeProfile.samples.length} enrollment samples
										</p>
									</section>
								)}

								<ProfileLibrary
									profiles={profiles}
									activeId={activeProfile?.id ?? null}
									onSelect={selectProfile}
									onDelete={deleteProfile}
									onExport={exportProfileFile}
									onImport={importProfile}
									onNew={newProfile}
								/>
							</aside>
						</div>
					) : (
						<div className="mt-6">
							<ConsentNotice
								status={consent}
								error={consentError}
								onAccept={acceptDataUse}
								onDecline={declineDataUse}
								onReview={requestDataUseReview}
							/>
						</div>
					)}

					<MetricGuide metrics={metrics} />

					<footer className="mt-14 flex flex-col gap-2 border-t border-[var(--rule)] pt-6 pb-2 text-sm md:flex-row md:items-baseline md:justify-between">
						<PrivacyNote onReview={requestDataUseReview} />
						<span className="font-display text-[0.95rem] font-extrabold whitespace-nowrap text-[var(--ink-3)]">
							Typing Metrics Print
						</span>
					</footer>
				</div>
			</div>

			{withdrawConfirming && (
				<div className="mx-auto w-full max-w-[1680px] px-5 sm:px-8 xl:px-12">
					<section
						ref={withdrawDialogRef}
						role="alertdialog"
						aria-modal="true"
						aria-labelledby="withdraw-title"
						aria-describedby="withdraw-description"
						className="card mt-6 p-6 md:p-8"
						tabIndex={-1}
					>
						<p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
							Withdraw data use
						</p>
						<h2
							id="withdraw-title"
							className="mt-1 font-display text-2xl font-extrabold tracking-tight text-[var(--ink)]"
						>
							Delete saved profiles?
						</h2>
						<p
							id="withdraw-description"
							className="mt-3 max-w-3xl text-[0.98rem] leading-relaxed text-[var(--ink-2)]"
						>
							Withdrawing consent deletes{" "}
							{profiles.length === 1
								? "1 saved profile"
								: `${profiles.length} saved profiles`}{" "}
							from this browser and stops the workspace. This cannot be undone.
							Export anything you want to keep first.
						</p>
						{withdrawError !== null && (
							<p role="alert" className="alert">
								{withdrawError}
							</p>
						)}
						<div className="mt-5 flex flex-wrap items-center gap-3">
							<button
								type="button"
								className="btn btn-primary"
								onClick={confirmDataUseWithdrawal}
							>
								Delete profiles and change choice
							</button>
							<button
								ref={withdrawCancelRef}
								type="button"
								className="btn btn-ghost"
								onClick={() => {
									setWithdrawError(null);
									setWithdrawConfirming(false);
								}}
							>
								Keep profiles
							</button>
						</div>
					</section>
				</div>
			)}
		</main>
	);
}
