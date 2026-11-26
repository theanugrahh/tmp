import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
	title: "Privacy notice — TMP",
};

export default function PrivacyPage() {
	return (
		<main id="top" className="pb-16">
			<SiteHeader />
			<div className="mx-auto w-full max-w-[980px] px-5 sm:px-8 xl:px-12">
				<article className="card mt-2 p-6 md:p-10">
					<p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
						Plain-language notice
					</p>
					<h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[var(--ink)]">
						Privacy notice
					</h1>
					<p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-[var(--ink-2)]">
						TMP is a local-first demo. It measures how you type and shows you a
						readable report. It is not an authentication system.
					</p>

					<section className="mt-9 border-t border-[var(--rule)] pt-6">
						<h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--ink)]">
							What is collected
						</h2>
						<p className="mt-2 text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
							When you consent and start capture, this page records timing gaps,
							hold times, and edits. The text you type stays in the page for the
							readout and is not written to a file unless you export the session
							yourself.
						</p>
					</section>

					<section className="mt-7 border-t border-[var(--rule)] pt-6">
						<h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--ink)]">
							Where it goes
						</h2>
						<p className="mt-2 text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
							Keystroke timing is sent to this site's analysis endpoint as
							opaque key IDs and modifier/correction flags. Literal key names
							are replaced before the request and are not saved by the server.
							Profiles and your consent choice are stored in this browser’s
							local storage. Withdrawing consent asks for confirmation, then
							deletes the profiles stored in this browser; you can also delete
							individual profiles from the vault at any time.
						</p>
					</section>

					<section className="mt-7 border-t border-[var(--rule)] pt-6">
						<h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--ink)]">
							Exports and sharing
						</h2>
						<p className="mt-2 text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
							Profile and session downloads are generated in your browser. After
							download, the file is yours to keep, share, or delete. TMP does
							not upload those files.
						</p>
					</section>

					<footer className="mt-9 flex flex-wrap gap-3 border-t border-[var(--rule)] pt-6">
						<a href="/" className="btn btn-primary">
							Back to workspace
						</a>
						<a href="/terms" className="btn">
							Terms of use
						</a>
					</footer>
				</article>
			</div>
		</main>
	);
}
