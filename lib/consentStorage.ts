export const CONSENT_STORAGE_KEY = "tmp.consent.v1";
export const CONSENT_POLICY_VERSION = "v1";

export type ConsentStatus = "accepted" | "declined";

export interface ConsentRecord {
	version: 1;
	policyVersion: string;
	status: ConsentStatus;
	decidedAt: string;
}

function isConsentRecord(value: unknown): value is ConsentRecord {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false;
	}
	const record = value as Record<string, unknown>;
	return (
		record.version === 1 &&
		record.policyVersion === CONSENT_POLICY_VERSION &&
		(record.status === "accepted" || record.status === "declined") &&
		typeof record.decidedAt === "string" &&
		!Number.isNaN(Date.parse(record.decidedAt))
	);
}

export function loadConsent(): ConsentRecord | null {
	try {
		const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
		if (raw === null) return null;
		const parsed: unknown = JSON.parse(raw);
		return isConsentRecord(parsed) ? parsed : null;
	} catch {
		return null;
	}
}

export function saveConsent(
	status: ConsentStatus,
	decidedAt: string = new Date().toISOString(),
): boolean {
	try {
		const record: ConsentRecord = {
			version: 1,
			policyVersion: CONSENT_POLICY_VERSION,
			status,
			decidedAt,
		};
		window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
		return true;
	} catch {
		return false;
	}
}

export function clearConsent(): boolean {
	try {
		window.localStorage.removeItem(CONSENT_STORAGE_KEY);
		return true;
	} catch {
		return false;
	}
}
