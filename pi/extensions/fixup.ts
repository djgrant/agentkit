import {
	type Api,
	type AssistantMessage,
	type AssistantMessageEventStream,
	type Context,
	type Model,
	type SimpleStreamOptions,
	type Usage,
	createAssistantMessageEventStream,
} from "@earendil-works/pi-ai";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PROVIDER_ID = "fixup-replay";
const MODEL_ID = "replay";
const API_ID = "fixup-replay-api" as Api;
const TRIGGER_TYPE = "fixup-trigger";

interface ReplayJob {
	text: string;
	originalModel: Model<Api>;
	streamStarted: boolean;
	completed: boolean;
}

function textFromAssistant(message: AssistantMessage): string {
	return message.content
		.filter((part): part is { type: "text"; text: string } => part.type === "text")
		.map((part) => part.text)
		.join("")
		.trim();
}

function makeRevisionRequest(instructions: string): string {
	return `Rewrite your previous response according to these instructions:\n\n${instructions}\n\nReturn only the complete replacement response. Do not discuss the revision or add a preamble.`;
}

function emptyUsage(): Usage {
	return {
		input: 0,
		output: 0,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens: 0,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
}

export default function fixupExtension(pi: ExtensionAPI) {
	let replayJob: ReplayJob | undefined;
	let fixupInProgress = false;
	let nextAgentSettle: (() => void) | undefined;

	function waitForNextAgentSettle(): { promise: Promise<void>; cancel: () => void } {
		if (nextAgentSettle) throw new Error("Already waiting for an agent run to settle");

		let active = true;
		let resolvePromise!: () => void;
		const promise = new Promise<void>((resolve) => {
			resolvePromise = resolve;
		});
		nextAgentSettle = () => {
			if (!active) return;
			active = false;
			resolvePromise();
		};

		return {
			promise,
			cancel: () => {
				if (!active) return;
				active = false;
				nextAgentSettle = undefined;
			},
		};
	}

	function streamReplay(
		model: Model<Api>,
		_context: Context,
		options?: SimpleStreamOptions,
	): AssistantMessageEventStream {
		const stream = createAssistantMessageEventStream();

		void (async () => {
			const job = replayJob;
			const output: AssistantMessage = {
				role: "assistant",
				content: [],
				api: model.api,
				provider: model.provider,
				model: model.id,
				// The generating response remains recorded on the abandoned branch, so
				// replaying its usage here would count the same model call twice.
				usage: emptyUsage(),
				stopReason: "pending",
				timestamp: Date.now(),
			};

			try {
				if (!job) throw new Error("No fixup response is queued");
				if (job.streamStarted) throw new Error("The queued fixup response has already been consumed");
				job.streamStarted = true;
				options?.signal?.throwIfAborted();

				stream.push({ type: "start", partial: output });
				output.content.push({ type: "text", text: "" });
				stream.push({ type: "text_start", contentIndex: 0, partial: output });

				const block = output.content[0];
				if (block.type !== "text") throw new Error("Failed to initialise fixup output");
				block.text = job.text;
				stream.push({ type: "text_delta", contentIndex: 0, delta: job.text, partial: output });
				stream.push({ type: "text_end", contentIndex: 0, content: job.text, partial: output });

				options?.signal?.throwIfAborted();
				output.stopReason = "stop";
				stream.push({ type: "done", reason: "stop", message: output });
				stream.end();
			} catch (error) {
				output.stopReason = options?.signal?.aborted ? "aborted" : "error";
				output.errorMessage = error instanceof Error ? error.message : String(error);
				stream.push({ type: "error", reason: output.stopReason, error: output });
				stream.end();
			}
		})();

		return stream;
	}

	pi.registerProvider(PROVIDER_ID, {
		name: "Fixup response replay",
		baseUrl: "local://fixup",
		apiKey: "fixup-local",
		api: API_ID,
		models: [
			{
				id: MODEL_ID,
				name: "Fixup replay",
				reasoning: false,
				input: ["text"],
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
				contextWindow: 1_000_000,
				maxTokens: 1_000_000,
			},
		],
		streamSimple: streamReplay,
	});

	// The hidden trigger starts an agent turn, but it must never become model context.
	pi.on("context", (event) => ({
		messages: event.messages.filter(
			(message) => message.role !== "custom" || message.customType !== TRIGGER_TYPE,
		),
	}));

	// Make the replayed message look as though it came from the model that actually
	// generated the fixup, rather than from the local transport used to insert it.
	pi.on("message_end", (event) => {
		const job = replayJob;
		if (!job || event.message.role !== "assistant" || event.message.provider !== PROVIDER_ID) return;

		job.completed = event.message.stopReason === "stop";
		return {
			message: {
				...event.message,
				api: job.originalModel.api,
				provider: job.originalModel.provider,
				model: job.originalModel.id,
			},
		};
	});

	// Model changes are session entries, so restore only after the replayed assistant
	// message has been persisted.
	pi.on("agent_settled", async (_event, ctx) => {
		const job = replayJob;
		if (job) {
			replayJob = undefined;
			const restored = await pi.setModel(job.originalModel);
			if (!restored && ctx.hasUI) {
				ctx.ui.notify(
					`Fixup was inserted, but ${job.originalModel.provider}/${job.originalModel.id} could not be restored`,
					"warning",
				);
			} else if (job.completed && ctx.hasUI) {
				ctx.ui.notify("Replaced the last assistant message", "info");
			}
		}

		const resolve = nextAgentSettle;
		nextAgentSettle = undefined;
		resolve?.();
	});

	pi.on("session_shutdown", () => {
		replayJob = undefined;
		fixupInProgress = false;
		nextAgentSettle = undefined;
	});

	pi.registerCommand("fixup", {
		description: "Replace the last assistant message on a new branch",
		handler: async (args, ctx) => {
			await ctx.waitForIdle();

			if (fixupInProgress || replayJob) {
				if (ctx.hasUI) ctx.ui.notify("A fixup is already in progress", "error");
				return;
			}

			const instructions = args.trim();
			if (!instructions) {
				if (ctx.hasUI) ctx.ui.notify("Usage: /fixup <revision instructions>", "error");
				return;
			}

			const originalModel = ctx.model;
			if (!originalModel) {
				if (ctx.hasUI) ctx.ui.notify("No model selected", "error");
				return;
			}
			if (!ctx.modelRegistry.hasConfiguredAuth(originalModel)) {
				if (ctx.hasUI) {
					ctx.ui.notify(`No authentication configured for ${originalModel.provider}/${originalModel.id}`, "error");
				}
				return;
			}

			const branch = ctx.sessionManager.getBranch();
			const target = [...branch].reverse().find(
				(entry) =>
					entry.type === "message" &&
					entry.message.role === "assistant" &&
					entry.message.stopReason === "stop" &&
					entry.message.content.some((part) => part.type === "text" && part.text.trim()),
			);

			if (!target || target.type !== "message" || target.message.role !== "assistant") {
				if (ctx.hasUI) ctx.ui.notify("No completed assistant message found", "error");
				return;
			}
			if (!target.parentId) {
				if (ctx.hasUI) ctx.ui.notify("The assistant message has no branch point", "error");
				return;
			}
			const branchPoint = ctx.sessionManager.getEntry(target.parentId);
			if (!branchPoint) {
				if (ctx.hasUI) ctx.ui.notify("The assistant message's branch point is unavailable", "error");
				return;
			}

			const replayModel = ctx.modelRegistry.find(PROVIDER_ID, MODEL_ID);
			if (!replayModel) {
				if (ctx.hasUI) ctx.ui.notify("Fixup replay model is unavailable", "error");
				return;
			}

			fixupInProgress = true;
			try {
				// Generate the replacement in the main conversation. This gives the main
				// model the original response, the user's revision request, and all prior
				// context. The whole generation path is retained as an alternate branch.
				const generationWaiter = waitForNextAgentSettle();
				try {
					pi.sendUserMessage(makeRevisionRequest(instructions));
				} catch (error) {
					generationWaiter.cancel();
					throw error;
				}
				await generationWaiter.promise;

				const generatedBranch = ctx.sessionManager.getBranch();
				const targetIndex = generatedBranch.findIndex((entry) => entry.id === target.id);
				const replacement = generatedBranch
					.slice(targetIndex + 1)
					.reverse()
					.find(
						(entry) =>
							entry.type === "message" &&
							entry.message.role === "assistant" &&
							entry.message.stopReason === "stop" &&
							entry.message.content.some((part) => part.type === "text" && part.text.trim()),
					);
				const generatedLeafId = ctx.sessionManager.getLeafId();

				if (
					targetIndex < 0 ||
					!replacement ||
					replacement.type !== "message" ||
					replacement.message.role !== "assistant" ||
					!generatedLeafId
				) {
					if (ctx.hasUI) ctx.ui.notify("The main model did not produce a completed replacement", "error");
					return;
				}

				const replacementText = textFromAssistant(replacement.message);
				if (!replacementText) {
					if (ctx.hasUI) ctx.ui.notify("The replacement response has no text", "error");
					return;
				}

				// Return to the point immediately before the old response, then insert the
				// newly generated response as its sibling on the active branch.
				const navigated = await ctx.navigateTree(target.parentId, { summarize: false });
				if (navigated.cancelled) return;
				if (branchPoint.type === "message" && branchPoint.message.role === "user") {
					// Navigating to a user entry restores its text into the composer. Fixup
					// immediately replays that prompt itself, so do not leave a duplicate draft.
					ctx.ui.setEditorText("");
				}

				const switched = await pi.setModel(replayModel);
				if (!switched) {
					await ctx.navigateTree(generatedLeafId, { summarize: false });
					if (ctx.hasUI) ctx.ui.notify("Could not activate the fixup replay model", "error");
					return;
				}

				const job: ReplayJob = {
					text: replacementText,
					originalModel,
					streamStarted: false,
					completed: false,
				};
				replayJob = job;

				const replayWaiter = waitForNextAgentSettle();
				try {
					if (branchPoint.type === "message" && branchPoint.message.role === "user") {
						// navigateTree treats a selected user message as an editable prompt and
						// positions the leaf before it. Re-submit that exact prompt so the active
						// branch contains the original user message followed by the replacement.
						pi.sendUserMessage(structuredClone(branchPoint.message.content));
					} else {
						pi.sendMessage(
							{
								customType: TRIGGER_TYPE,
								content: "Insert the prepared fixup response.",
								display: false,
							},
							{ triggerTurn: true },
						);
					}
					await replayWaiter.promise;
					if (!job.completed) {
						await ctx.navigateTree(generatedLeafId, { summarize: false });
						if (ctx.hasUI) ctx.ui.notify("Fixup replay failed; restored the generated branch", "error");
					}
				} catch (error) {
					replayWaiter.cancel();
					replayJob = undefined;
					await ctx.navigateTree(generatedLeafId, { summarize: false });
					throw error;
				}
			} finally {
				fixupInProgress = false;
			}
		},
	});
}
