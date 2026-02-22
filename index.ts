/**
 * Review Extension - Generate structured reviews of code changes
 *
 * Provides:
 * - `review` tool: Invokes the narrator agent to produce structured reviews
 * - `/review` command: Launch TUI walkthrough (stub for now)
 */

import { spawn } from "node:child_process";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import type { ExtensionAPI, ExtensionContext } from "@mariozechner/pi-coding-agent";
import { StringEnum } from "@mariozechner/pi-ai";
import { Type } from "@sinclair/typebox";
import type { Review } from "./types.js";
import { renderReviewAsMarkdown } from "./render.js";
import { extractJsonFromResponse, parseReviewJson } from "./parser.js";
import { findReviews } from "./session.js";
import { SummaryView } from "./summary-view.js";
import { WalkthroughView } from "./walkthrough.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Launch the TUI walkthrough for a review
 */
async function launchReviewTUI(review: Review, ctx: ExtensionContext): Promise<void> {
	if (!ctx.hasUI) {
		ctx.ui.notify("TUI not available in this context", "error");
		return;
	}

	ctx.ui.setTitle(review.title);

	await ctx.ui.custom<void>(
		(tui, theme, _kb, done) => {
			let mode: "summary" | "detail" = "summary";
			let selectedIndex = 0;
			let summaryView: SummaryView;
			let walkthroughView: WalkthroughView | null = null;

			// Create summary view
			summaryView = new SummaryView(review, theme, tui, {
				onSelect: (index) => {
					mode = "detail";
					selectedIndex = index;
					summaryView.clearTimer();
					walkthroughView = new WalkthroughView(review, index, theme, tui, {
						onBack: () => {
							mode = "summary";
							walkthroughView = null;
							summaryView.restartTimer();
							tui.requestRender();
						},
						onClose: () => done(),
					});
					tui.requestRender();
				},
				onClose: () => done(),
			}, 0);

			return {
				render(width: number) {
					if (mode === "detail" && walkthroughView) {
						return walkthroughView.render(width);
					}
					return summaryView.render(width);
				},
				handleInput(data: string) {
					if (mode === "detail" && walkthroughView) {
						walkthroughView.handleInput(data);
					} else {
						summaryView.handleInput(data);
					}
				},
				invalidate() {},
			};
		},
		{ overlay: true },
	);
}

export default function (pi: ExtensionAPI) {
	pi.registerTool({
		name: "review",
		label: "Review",
		description:
			"Run the narrator agent to produce a structured review of recent changes. The narrator discovers what changed via git/jj.",
		parameters: Type.Object({
			task: Type.String({ description: "Context for the review: why the changes were made, design intent, or background. The narrator discovers what changed via git/jj." }),
			mode: Type.Optional(
				StringEnum(["structured", "text"] as const, {
					description: 'Output mode. "structured" (default) returns JSON, "text" returns markdown prose',
					default: "structured",
				}),
			),
		}),

		async execute(_toolCallId, params, signal, onUpdate, ctx) {
			const narratorPromptPath = path.resolve(__dirname, "agents", "narrator.md");
			const mode = params.mode ?? "structured";

			// Invoke narrator via pi --mode json
			const args = [
				"--mode",
				"json",
				"-p",
				"--no-session",
				"--model",
				"claude-sonnet-4-5",
				"--tools",
				"read,grep,find,ls,bash",
				"--append-system-prompt",
				narratorPromptPath,
				`Context: ${params.task}`,
			];

			let stdout = "";
			let stderr = "";
			let wasAborted = false;
			let accumulatedText = "";

			const exitCode = await new Promise<number>((resolve) => {
				const proc = spawn("pi", args, {
					cwd: ctx.cwd,
					shell: false,
					stdio: ["ignore", "pipe", "pipe"],
				});

				proc.stdout.on("data", (data) => {
					const chunk = data.toString();
					stdout += chunk;

					// Parse JSON lines as they arrive for streaming
					const lines = chunk.split("\n");
					for (const line of lines) {
						if (!line.trim()) continue;
						try {
							const event = JSON.parse(line);
							if (event.type === "message_update") {
								const assistantEvent = event.assistantMessageEvent;
								if (assistantEvent?.type === "text_delta") {
									// Accumulate text and stream progress
									accumulatedText += assistantEvent.delta;
									onUpdate?.({ content: [{ type: "text", text: accumulatedText }] });
								}
							}
						} catch {
							// Ignore parse errors for individual lines
						}
					}
				});

				proc.stderr.on("data", (data) => {
					stderr += data.toString();
				});

				proc.on("close", (code) => {
					resolve(code ?? 1);
				});

				proc.on("error", () => {
					resolve(1);
				});

				if (signal) {
					const killProc = () => {
						wasAborted = true;
						proc.kill("SIGTERM");
						setTimeout(() => {
							if (!proc.killed) proc.kill("SIGKILL");
						}, 5000);
					};
					if (signal.aborted) killProc();
					else signal.addEventListener("abort", killProc, { once: true });
				}
			});

			if (wasAborted) {
				return {
					content: [{ type: "text", text: "Review was aborted" }],
					isError: true,
				};
			}

			if (exitCode !== 0) {
				return {
					content: [{ type: "text", text: `Narrator agent failed (exit ${exitCode}): ${stderr || "(no error output)"}` }],
					isError: true,
				};
			}

			// Parse JSON output - extract final assistant message text
			const lines = stdout.split("\n");
			let finalAssistantText = "";

			for (const line of lines) {
				if (!line.trim()) continue;
				try {
					const event = JSON.parse(line);
					if (event.type === "message_end" && event.message?.role === "assistant") {
						// Extract text from assistant message
						for (const part of event.message.content || []) {
							if (part.type === "text") {
								finalAssistantText = part.text;
							}
						}
					}
				} catch {
					// Ignore parse errors for individual lines
				}
			}

			if (!finalAssistantText) {
				return {
					content: [{ type: "text", text: "Narrator produced no output" }],
					isError: true,
				};
			}

			// Extract and parse JSON using parser module
			let reviewJson: string;
			try {
				reviewJson = extractJsonFromResponse(finalAssistantText);
			} catch (err) {
				return {
					content: [
						{
							type: "text",
							text: `Failed to extract JSON from narrator output: ${err instanceof Error ? err.message : String(err)}\n\nRaw output:\n\n${finalAssistantText}`,
						},
					],
					isError: true,
				};
			}

			let review: Review;
			try {
				review = parseReviewJson(reviewJson);
			} catch (err) {
				return {
					content: [
						{
							type: "text",
							text: `Failed to parse review JSON: ${err instanceof Error ? err.message : String(err)}\n\nRaw JSON:\n${reviewJson}`,
						},
					],
					isError: true,
				};
			}

			// Handle text mode - send to chat instead of returning structured data
			if (mode === "text") {
				const markdown = renderReviewAsMarkdown(review);
				pi.sendMessage({
					customType: "review-text",
					content: markdown,
					display: true,
				});
				return {
					content: [{ type: "text", text: "Review sent to chat." }],
					details: { review },
				};
			}

			// Default: structured mode
			// If UI is available, launch TUI walkthrough
			if (ctx.hasUI) {
				await launchReviewTUI(review, ctx);
			}

			return {
				content: [{ type: "text", text: reviewJson }],
				details: { review },
			};
		},
	});

	// Register /review command - find and display past reviews
	pi.registerCommand("review", {
		description: "Launch review TUI walkthrough",
		handler: async (_args, ctx) => {
			// Find all reviews in session history
			const reviews = findReviews(ctx.sessionManager);

			if (reviews.length === 0) {
				ctx.ui.notify("No reviews found in current session. Run the review tool first.", "error");
				return;
			}

			// If single review, use it directly
			let selectedReview = reviews[0];

			// If multiple reviews, let user select
			if (reviews.length > 1) {
				const options = reviews.map((r) => r.label);
				const selected = await ctx.ui.select("Select a review to display:", options);

				if (!selected) {
					ctx.ui.notify("Review selection cancelled.", "info");
					return;
				}

				// Find the review matching the selected label
				const match = reviews.find((r) => r.label === selected);
				if (match) {
					selectedReview = match;
				}
			}

			// Launch TUI walkthrough
			await launchReviewTUI(selectedReview.review, ctx);
		},
	});
}
