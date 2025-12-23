import { create } from "zustand";

interface CloudflareState {
	isChallengePending: boolean;
	challengeHtml: string | null;
	challengeUrl: string | null;
	onChallengeComplete: (() => void) | null;

	showChallenge: (html: string, url: string, onComplete?: () => void) => void;
	hideChallenge: () => void;
	completeChallenge: () => void;
}

export const useCloudflareStore = create<CloudflareState>()((set, get) => ({
	isChallengePending: false,
	challengeHtml: null,
	challengeUrl: null,
	onChallengeComplete: null,

	showChallenge: (html: string, url: string, onComplete?: () => void) => {
		console.log("=== cloudflareStore.showChallenge called ===");
		console.log("url:", url);
		console.log("html length:", html?.length);
		console.log("Current state before update:", get().isChallengePending);

		set({
			isChallengePending: true,
			challengeHtml: html,
			challengeUrl: url,
			onChallengeComplete: onComplete || null,
		});

		console.log("State after update:", get().isChallengePending);
	},

	hideChallenge: () => {
		set({
			isChallengePending: false,
			challengeHtml: null,
			challengeUrl: null,
			onChallengeComplete: null,
		});
	},

	completeChallenge: () => {
		const { onChallengeComplete } = get();
		if (onChallengeComplete) {
			onChallengeComplete();
		}
		set({
			isChallengePending: false,
			challengeHtml: null,
			challengeUrl: null,
			onChallengeComplete: null,
		});
	},
}));

/**
 * 检测响应是否为Cloudflare挑战页面
 */
export function isCloudflareChallenge(html: string): boolean {
	return html.includes("Just a moment...") || html.includes("_cf_chl_opt") || html.includes("challenge-platform");
}
