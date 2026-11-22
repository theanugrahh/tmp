import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const display = Cormorant_Garamond({
	variable: "--font-display",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	display: "swap",
});

const ui = Inter({
	variable: "--font-ui",
	subsets: ["latin"],
	weight: ["300", "400", "500", "600"],
	display: "swap",
});

const mono = JetBrains_Mono({
	variable: "--font-mono",
	subsets: ["latin"],
	weight: ["400", "500", "600", "700"],
	display: "swap",
});

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	colorScheme: "light dark",
};

export const metadata: Metadata = {
	title: "TMP — Typing Metrics Print",
	description: "Type something. We print what we see.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html
			lang="en"
			className={`${display.variable} ${ui.variable} ${mono.variable}`}
		>
			<body>
				<div className="min-h-dvh bg-[var(--bg)] text-[var(--text)]">
					{children}
				</div>
			</body>
		</html>
	);
}
