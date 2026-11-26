import { SiteHeader } from "@/components/SiteHeader";

export const metadata = {
	title: "Terms of use — TMP",
};

export default function TermsPage() {
	return (
		<main id="top" className="pb-16">
			<SiteHeader />
			<div className="mx-auto w-full max-w-[980px] px-5 sm:px-8 xl:px-12">
				<article className="card mt-2 p-6 md:p-10">
					<p className="text-[0.65rem] font-extrabold tracking-[0.16em] text-[var(--ink-3)] uppercase">
						Baseline terms
					</p>
					<h1 className="mt-2 font-display text-4xl font-extrabold leading-[1.05] tracking-[-0.04em] text-[var(--ink)]">
						Terms of use
					</h1>
					<p className="mt-5 max-w-2xl text-lg font-semibold leading-relaxed text-[var(--ink-2)]">
						These terms explain the limits of this demo. Use TMP only with
						consent from the person typing and never as a security decision.
					</p>

					<section className="mt-9 border-t border-[var(--rule)] pt-6">
						<h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--ink)]">
							Demo, not identity proof
						</h2>
						<p className="mt-2 text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
							TMP is not an authentication system. Typing rhythm can change with
							device, injury, fatigue, stress, or environment. Scores are
							exploratory signals and must not be used to grant access, deny
							access, accuse someone, or make consequential decisions.
						</p>
					</section>

					<section className="mt-7 border-t border-[var(--rule)] pt-6">
						<h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--ink-2)]">
							Acceptable use
						</h2>
						<p className="mt-2 text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
							Do not capture anyone’s typing without their informed consent. Do
							not use TMP to impersonate, surveil, discriminate, or infer
							sensitive traits. Do not try to break the site, overload the
							analysis endpoint, or reverse engineer private systems.
						</p>
					</section>

					<section className="mt-7 border-t border-[var(--rule)] pt-6">
						<h2 className="font-display text-xl font-extrabold tracking-tight text-[var(--ink)]">
							Your files
						</h2>
						<p className="mt-2 text-[0.98rem] leading-relaxed text-[var(--ink-2)]">
							Profiles stay in your browser until you delete or export them.
							Exported files are under your control. TMP does not claim
							ownership of files you create and does not transmit them.
						</p>
					</section>

					<footer className="mt-9 flex flex-wrap gap-3 border-t border-[var(--rule)] pt-6">
						<a href="/" className="btn btn-primary">
							Back to workspace
						</a>
						<a href="/privacy" className="btn">
							Privacy notice
						</a>
					</footer>
				</article>
			</div>
		</main>
	);
}
