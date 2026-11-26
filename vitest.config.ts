import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = fileURLToPath(new URL(".", import.meta.url)).replace(/\/$/, "");

export default defineConfig({
	resolve: {
		alias: [{ find: /^@\/(.*)$/, replacement: `${rootDir}/$1` }],
	},
	test: {
		environment: "jsdom",
		coverage: {
			provider: "v8",
			reporter: ["text", "json-summary"],
			include: [
				"app/**/*.{ts,tsx}",
				"components/**/*.tsx",
				"hooks/**/*.ts",
				"lib/**/*.ts",
			],
			exclude: ["**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"],
			thresholds: {
				statements: 80,
				branches: 80,
				functions: 80,
				lines: 80,
			},
		},
	},
});
