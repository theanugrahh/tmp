import { type KeyboardEvent, useRef } from "react";

export type WorkspaceMode = "analyze" | "enroll" | "verify";

const MODES: { key: WorkspaceMode; label: string; hint: string }[] = [
	{ key: "analyze", label: "Analyze", hint: "One-off readout" },
	{ key: "enroll", label: "Enroll", hint: "Save your rhythm" },
	{ key: "verify", label: "Verify", hint: "Compare to a profile" },
];

interface ModeSwitchProps {
	mode: WorkspaceMode;
	onChange: (mode: WorkspaceMode) => void;
}

export function ModeSwitch({ mode, onChange }: ModeSwitchProps) {
	const tabRefs = useRef<Record<WorkspaceMode, HTMLButtonElement | null>>({
		analyze: null,
		enroll: null,
		verify: null,
	});

	const focusMode = (index: number) => {
		const target = MODES[(index + MODES.length) % MODES.length];
		if (!target) return;
		onChange(target.key);
		tabRefs.current[target.key]?.focus();
	};

	const handleKeyDown = (
		event: KeyboardEvent<HTMLButtonElement>,
		index: number,
	) => {
		switch (event.key) {
			case "ArrowRight":
				event.preventDefault();
				focusMode(index + 1);
				break;
			case "ArrowLeft":
				event.preventDefault();
				focusMode(index - 1);
				break;
			case "Home":
				event.preventDefault();
				focusMode(0);
				break;
			case "End":
				event.preventDefault();
				focusMode(MODES.length - 1);
				break;
		}
	};

	return (
		<div
			role="tablist"
			aria-label="Workspace mode"
			className="mt-10 flex flex-wrap gap-2 border-b border-[var(--rule)] pb-4"
		>
			{MODES.map((item, index) => {
				const active = mode === item.key;
				return (
					<button
						key={item.key}
						ref={(element) => {
							tabRefs.current[item.key] = element;
						}}
						id={`mode-tab-${item.key}`}
						type="button"
						role="tab"
						aria-selected={active}
						aria-controls="workspace-panel"
						tabIndex={active ? 0 : -1}
						onClick={() => onChange(item.key)}
						onKeyDown={(event) => handleKeyDown(event, index)}
						className={`mode-tab${active ? " mode-tab-active" : ""}`}
					>
						<span className="font-display text-base font-extrabold tracking-tight">
							{item.label}
						</span>
						<span className="mt-0.5 text-xs font-semibold text-[var(--ink-3)]">
							{item.hint}
						</span>
					</button>
				);
			})}
		</div>
	);
}
