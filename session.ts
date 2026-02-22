import type { Review } from "./types.js";

export interface FoundReview {
	review: Review;
	entryId: string;
	timestamp: string;
	label: string;
}

/**
 * Find all review tool results in the current session history
 * @param sessionManager Session manager from extension context (ReadonlySessionManager, not exported from SDK)
 * @returns Array of found reviews in chronological order
 */
export function findReviews(sessionManager: any): FoundReview[] {
	const found: FoundReview[] = [];

	// Note: ReadonlySessionManager is not exported from @mariozechner/pi-coding-agent,
	// so we use `any` here. The interface provides getEntries() which returns SessionEntry[].
	// Session entries have shape: { type: "message", message: AgentMessage, ... }

	try {
		const entries = sessionManager.getEntries();

		for (const entry of entries) {
			// Filter for tool result messages from the review tool
			if (
				entry.type === "message" &&
				entry.message?.role === "toolResult" &&
				entry.message?.toolName === "review"
			) {
				const review = entry.message.details?.review;

				// Skip if no review in details (graceful degradation)
				if (!review) {
					continue;
				}

				// Build label from title or summary (truncate to 60 chars)
				let label = review.title || review.summary || "Untitled Review";
				if (label.length > 60) {
					label = label.substring(0, 57) + "...";
				}

				found.push({
					review,
					entryId: entry.id || "unknown",
					timestamp: entry.timestamp || new Date().toISOString(),
					label,
				});
			}
		}
	} catch (err) {
		// If session manager doesn't support getEntries or something else fails, return empty
		console.error("Failed to find reviews in session:", err);
		return [];
	}

	return found;
}
