import type { Metadata, Viewport } from "next";
import "./globals.css";

export const viewport: Viewport = {
	width: "device-width",
	initialScale: 1,
	colorScheme: "light dark",
};

export const metadata: Metadata = {
	title: "TMP — Typing Metrics Print",
	description:
		"Enroll, save, and verify your typing rhythm with a local fingerprint vault.",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className="font-ui">
			<body>{children}</body>
		</html>
	);
}
