"use client";

import { useCallback, useState } from "react";
import { CapturePanel } from "@/components/CapturePanel";
import { PrivacyNote } from "@/components/PrivacyNote";
import { ReadoutCard } from "@/components/ReadoutCard";
import { TimelineChart } from "@/components/TimelineChart";
import { useTypingCapture } from "@/hooks/useTypingCapture";
import type { TypingMetrics } from "@/lib/types";

export default function Page() {
	const { capturing, start, stop, handleKeyDown, handleKeyUp } =
		useTypingCapture();
	const [metrics, setMetrics] = useState<TypingMetrics | null>(null);
	const [readout, setReadout] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);

	const analyze = useCallback(async () => {
		const events = stop();
		setError(null);
		setReadout(null);
		setMetrics(null);
		try {
			const response = await fetch("/api/analyze", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ events }),
			});
			if (!response.ok) {
				throw new Error("The server could not read this typing pattern.");
			}
			const data = (await response.json()) as {
				metrics: TypingMetrics;
				readout: string;
			};
			setMetrics(data.metrics);
			setReadout(data.readout);
		} catch {
			setError("Something went wrong — try again.");
		}
	}, [stop]);

	return (
		<main className="mx-auto max-w-2xl px-6 py-20 md:px-10">
			<header className="text-center">
				<h1 className="font-display text-5xl font-semibold tracking-tight leading-tight text-[var(--accent)] md:text-6xl">
					TMP
				</h1>
				<p className="mt-5 font-display text-3xl text-[var(--text)]">
					Typing Metrics Print
				</p>
				<p className="mt-2 text-base text-[var(--muted)]">
					Type something. We print what we see.
				</p>
			</header>
			<CapturePanel
				capturing={capturing}
				onKeyDown={handleKeyDown}
				onKeyUp={handleKeyUp}
				onStart={start}
				onAnalyze={analyze}
			/>
			{error !== null && (
				<p role="alert" className="mt-5 text-sm text-[var(--accent)]">
					{error}
				</p>
			)}
			{metrics !== null && readout !== null && (
				<ReadoutCard metrics={metrics} readout={readout} />
			)}
			{metrics !== null && metrics.intervals.length > 0 && (
				<TimelineChart intervals={metrics.intervals} />
			)}
			<PrivacyNote />
		</main>
	);
}
