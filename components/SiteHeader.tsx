export function SiteHeader() {
	return (
		<header className="mx-auto flex w-full max-w-[1680px] items-center justify-between gap-4 px-5 py-6 sm:px-8 xl:px-12">
			<a
				href="#top"
				className="focus-ring rounded-lg no-underline"
				aria-label="Typing Metrics Print — back to top"
			>
				<span className="font-display text-[1.35rem] font-extrabold leading-none tracking-[-0.04em] text-[var(--ink)] sm:text-2xl">
					Typing Metrics Print
				</span>
			</a>
			<nav className="flex items-center gap-1">
				<a href="#understand" className="btn btn-ghost">
					How it works
				</a>
				<a href="/privacy" className="btn btn-ghost">
					Privacy notice
				</a>
				<a href="/terms" className="btn btn-ghost">
					Terms
				</a>
			</nav>
		</header>
	);
}
