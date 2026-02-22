import type { Review, NarrativeSection, CodeBlock } from "./types.js";

/**
 * Extract JSON from markdown code fence or raw text
 * @param text Raw response text that may contain ```json fences
 * @returns Extracted JSON string
 */
export function extractJsonFromResponse(text: string): string {
	// Try to extract from markdown code fence first
	const jsonFenceMatch = text.match(/```json\s*\n([\s\S]*?)\n```/);
	if (jsonFenceMatch) {
		return jsonFenceMatch[1].trim();
	}

	// Try parsing the whole text as JSON
	try {
		JSON.parse(text);
		return text.trim();
	} catch {
		throw new Error("No valid JSON found in response (not in ```json fence and not parseable as raw JSON)");
	}
}

/**
 * Parse and validate review JSON structure
 * @param raw JSON string to parse
 * @returns Validated Review object
 * @throws Error with descriptive message if validation fails
 */
export function parseReviewJson(raw: string): Review {
	let parsed: unknown;

	try {
		parsed = JSON.parse(raw);
	} catch (err) {
		throw new Error(`Invalid JSON: ${err instanceof Error ? err.message : String(err)}`);
	}

	// Validate structure
	if (typeof parsed !== "object" || parsed === null) {
		throw new Error("Review must be an object");
	}

	const review = parsed as Record<string, unknown>;

	// Validate title
	if (typeof review.title !== "string") {
		throw new Error("Review.title must be a string");
	}

	// Validate summary
	if (typeof review.summary !== "string") {
		throw new Error("Review.summary must be a string");
	}

	// Validate sections
	if (!Array.isArray(review.sections)) {
		throw new Error("Review.sections must be an array");
	}

	for (let i = 0; i < review.sections.length; i++) {
		const section = review.sections[i];
		if (typeof section !== "object" || section === null) {
			throw new Error(`Review.sections[${i}] must be an object`);
		}

		const s = section as Record<string, unknown>;

		if (typeof s.title !== "string") {
			throw new Error(`Review.sections[${i}].title must be a string`);
		}

		if (typeof s.explanation !== "string") {
			throw new Error(`Review.sections[${i}].explanation must be a string`);
		}

		if (!Array.isArray(s.codeBlocks)) {
			throw new Error(`Review.sections[${i}].codeBlocks must be an array`);
		}

		for (let j = 0; j < s.codeBlocks.length; j++) {
			const codeBlock = s.codeBlocks[j];
			if (typeof codeBlock !== "object" || codeBlock === null) {
				throw new Error(`Review.sections[${i}].codeBlocks[${j}] must be an object`);
			}

			const cb = codeBlock as Record<string, unknown>;

			if (typeof cb.lang !== "string") {
				throw new Error(`Review.sections[${i}].codeBlocks[${j}].lang must be a string`);
			}

			if (typeof cb.path !== "string") {
				throw new Error(`Review.sections[${i}].codeBlocks[${j}].path must be a string`);
			}

			if (typeof cb.startLine !== "number") {
				throw new Error(`Review.sections[${i}].codeBlocks[${j}].startLine must be a number`);
			}

			if (typeof cb.endLine !== "number") {
				throw new Error(`Review.sections[${i}].codeBlocks[${j}].endLine must be a number`);
			}

			if (typeof cb.code !== "string") {
				throw new Error(`Review.sections[${i}].codeBlocks[${j}].code must be a string`);
			}
		}

		// note is optional, but if present must be string
		if (s.note !== undefined && typeof s.note !== "string") {
			throw new Error(`Review.sections[${i}].note must be a string if present`);
		}
	}

	return review as Review;
}
