import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { BorderedLoader, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { Usage } from "@earendil-works/pi-ai";
import { Text } from "@earendil-works/pi-tui";

function promptOne(question: string): string {
	return `User question:

\`\`\`
${question}
\`\`\`

Instructions:

Section 1: Averments

Annotate each sentence with an ID.

Annotate each sentence's type – one of subject, assertion, examples, evidence, explanation or qualification.

Annotate the concepts introduced by each sentence.

Annotate each sentence's relations. Example relation types can include: defines, qualifies, explains, causes, implies, contrasts, supports, explains.

Example:

\`\`\`markdown
<!--- id: {string} --->
<!--- type: {type} -->
<!--- concepts_introduced: [concepts] -->
<!--- [{relation}]: [ids] -->
Sentence goes here.
\`\`\`

Stage 2: Recurse

Re-run the process above on:

- Any concepts that go several layers deeper than the main subject matter or into another field
- Any concepts that appear to have a singular or unordinary significance

Stage 3: Concepts

Append definitions for all the concepts introduced:

\`\`\`markdown
<!-- concept: {concept} -->
Explanation of concept goes below. Can include examples, counter-examples, qualifications and evidence.
\`\`\``;
}

function promptTwo(question: string, rawMaterial: string): string {
	return `Use the raw material below to create a short document of readable prose answering the user's question: "${question}". The answer should flow naturally, building concepts brick-by-brick, co-locating ideas that exist in tension, and anticipating confusion by interjecting explanations. Generally, you should use the below text verbatim, but you may punctuate the document with sections and bullets so that there's the shape of an answer when you step back and squint. You may make minor modifications to the text to keep the prose smooth, and field softball questions to keep the flow.

${rawMaterial}`;
}

function mergeUsage(...items: Usage[]): Usage {
	const hasCacheWrite1h = items.some((usage) => usage.cacheWrite1h !== undefined);
	const hasReasoning = items.some((usage) => usage.reasoning !== undefined);

	return {
		input: items.reduce((total, usage) => total + usage.input, 0),
		output: items.reduce((total, usage) => total + usage.output, 0),
		cacheRead: items.reduce((total, usage) => total + usage.cacheRead, 0),
		cacheWrite: items.reduce((total, usage) => total + usage.cacheWrite, 0),
		...(hasCacheWrite1h && {
			cacheWrite1h: items.reduce((total, usage) => total + (usage.cacheWrite1h ?? 0), 0),
		}),
		...(hasReasoning && {
			reasoning: items.reduce((total, usage) => total + (usage.reasoning ?? 0), 0),
		}),
		totalTokens: items.reduce((total, usage) => total + usage.totalTokens, 0),
		cost: {
			input: items.reduce((total, usage) => total + usage.cost.input, 0),
			output: items.reduce((total, usage) => total + usage.cost.output, 0),
			cacheRead: items.reduce((total, usage) => total + usage.cost.cacheRead, 0),
			cacheWrite: items.reduce((total, usage) => total + usage.cost.cacheWrite, 0),
			total: items.reduce((total, usage) => total + usage.cost.total, 0),
		},
	};
}

function getPiInvocation(args: string[]): { command: string; args: string[] } {
	const currentScript = process.argv[1];
	const isBunVirtualScript = currentScript?.startsWith("/$bunfs/root/");
	if (currentScript && !isBunVirtualScript && fs.existsSync(currentScript)) {
		return { command: process.execPath, args: [currentScript, ...args] };
	}

	const execName = path.basename(process.execPath).toLowerCase();
	const isGenericRuntime = /^(node|bun)(\.exe)?$/.test(execName);
	return isGenericRuntime ? { command: "pi", args } : { command: process.execPath, args };
}

function assistantText(message: any): string {
	if (!Array.isArray(message?.content)) return "";
	return message.content
		.filter((part: any) => part?.type === "text" && typeof part.text === "string")
		.map((part: any) => part.text)
		.join("");
}

function toolSummary(toolName: string, args: Record<string, unknown>): string {
	const path = args.path ?? args.file_path;
	if (typeof path === "string") return `${toolName} ${path}`;
	if (toolName === "bash" && typeof args.command === "string") {
		const command = args.command.replace(/\s+/g, " ").trim();
		return `$ ${command.length > 100 ? `${command.slice(0, 100)}…` : command}`;
	}
	const encoded = JSON.stringify(args);
	if (!encoded || encoded === "{}") return toolName;
	return `${toolName} ${encoded.length > 100 ? `${encoded.slice(0, 100)}…` : encoded}`;
}

export default function docExtension(pi: ExtensionAPI) {
	let pendingSubagentUsage: Usage | undefined;

	pi.on("message_end", (event) => {
		if (event.message.role !== "assistant" || !pendingSubagentUsage) return;

		const usage = mergeUsage(event.message.usage, pendingSubagentUsage);
		pendingSubagentUsage = undefined;
		return { message: { ...event.message, usage } };
	});

	pi.registerEntryRenderer("doc-progress", (entry, _options, theme) => {
		const data = entry.data as { message?: string; kind?: "active" | "success" | "error" };
		const color = data.kind === "error" ? "error" : data.kind === "success" ? "success" : "muted";
		return new Text(theme.fg(color, `doc › ${data.message ?? "Working"}`), 1, 0);
	});

	pi.registerCommand("doc", {
		description: "Write a salient document",
		handler: async (args, ctx) => {
			const question = args.trim();
			if (!question) {
				if (ctx.hasUI) ctx.ui.notify("Usage: /doc <question>", "error");
				return;
			}

			const model = ctx.model;
			if (!model) {
				if (ctx.hasUI) ctx.ui.notify("No model selected", "error");
				return;
			}
			if (!ctx.modelRegistry.hasConfiguredAuth(model)) {
				if (ctx.hasUI) ctx.ui.notify(`No authentication configured for ${model.provider}/${model.id}`, "error");
				return;
			}

			const reportProgress = (message: string, kind: "active" | "success" | "error" = "active") => {
				pi.appendEntry("doc-progress", { message, kind });
			};

			const generateRawMaterial = async (
				signal?: AbortSignal,
			): Promise<{ text: string; usage: Usage }> => {
				signal?.throwIfAborted();
				reportProgress("Loading isolated agent");

				const activeTools = pi.getActiveTools();
				const activeToolNames = new Set(activeTools);
				const additionalExtensionPaths = [
					...new Set(
						pi
							.getAllTools()
							.filter(
								(tool) =>
									activeToolNames.has(tool.name) &&
									tool.sourceInfo.source !== "builtin" &&
									!tool.sourceInfo.path.startsWith("<"),
							)
							.map((tool) => tool.sourceInfo.path),
					),
				];
				const args = [
					"--mode",
					"json",
					"--print",
					"--no-session",
					"--provider",
					model.provider,
					"--model",
					`${model.provider}/${model.id}`,
				];
				if (ctx.thinkingLevel) args.push("--thinking", ctx.thinkingLevel);
				if (activeTools.length > 0) args.push("--tools", activeTools.join(","));
				for (const extensionPath of additionalExtensionPaths) args.push("--extension", extensionPath);
				args.push("--", promptOne(question));

				const invocation = getPiInvocation(args);
				let stderr = "";
				let text = "";
				let usage = mergeUsage();
				let stopReason: string | undefined;
				let errorMessage: string | undefined;
				let writing = false;
				const toolSummaries = new Map<string, string>();

				await new Promise<void>((resolve, reject) => {
					const child = spawn(invocation.command, invocation.args, {
						cwd: ctx.cwd,
						shell: false,
						stdio: ["ignore", "pipe", "pipe"],
					});
					const abort = () => child.kill();
					signal?.addEventListener("abort", abort, { once: true });
					let buffer = "";

					const processLine = (line: string) => {
						if (!line.trim()) return;
						let event: any;
						try {
							event = JSON.parse(line);
						} catch {
							return;
						}

						switch (event.type) {
							case "agent_start":
								reportProgress(`Researching with ${model.id}`);
								break;
							case "turn_start":
								writing = false;
								break;
							case "tool_execution_start": {
								const summary = toolSummary(event.toolName, event.args ?? {});
								toolSummaries.set(event.toolCallId, summary);
								reportProgress(`→ ${summary}`);
								break;
							}
							case "tool_execution_end": {
								const summary = toolSummaries.get(event.toolCallId) ?? event.toolName;
								toolSummaries.delete(event.toolCallId);
								reportProgress(
									`${event.isError ? "✗" : "✓"} ${summary}`,
									event.isError ? "error" : "success",
								);
								break;
							}
							case "message_update":
								if (!writing && event.assistantMessageEvent?.type === "text_start") {
									writing = true;
									reportProgress("Writing raw material");
								}
								break;
							case "message_end":
								if (event.message?.role === "assistant") {
									text = assistantText(event.message).trim() || text;
									if (event.message.usage) usage = mergeUsage(usage, event.message.usage);
									stopReason = event.message.stopReason;
									errorMessage = event.message.errorMessage;
								} else if (event.message?.role === "toolResult" && event.message.usage) {
									usage = mergeUsage(usage, event.message.usage);
								}
								break;
						}
					};

					child.stdout.on("data", (chunk) => {
						buffer += chunk.toString();
						const lines = buffer.split("\n");
						buffer = lines.pop() ?? "";
						for (const line of lines) processLine(line);
					});
					child.stderr.on("data", (chunk) => {
						stderr += chunk.toString();
					});
					child.once("error", reject);
					child.once("close", (code) => {
						signal?.removeEventListener("abort", abort);
						if (buffer.trim()) processLine(buffer);
						if (signal?.aborted) {
							reject(signal.reason ?? new Error("Raw-material generation cancelled"));
						} else if (code !== 0) {
							reject(new Error(stderr.trim() || `The isolated agent exited with code ${code}`));
						} else {
							resolve();
						}
					});
				});

				if (stopReason === "error" || stopReason === "aborted") {
					throw new Error(errorMessage || `The isolated agent stopped with ${stopReason}`);
				}
				if (!text) throw new Error("The isolated agent returned no text");
				const billedTokens = usage.input + usage.output + usage.cacheRead + usage.cacheWrite;
				reportProgress(`Raw material ready (${billedTokens.toLocaleString()} tokens)`, "success");
				return { text, usage };
			};

			let rawMaterial: { text: string; usage: Usage } | null = null;
			let generationError: unknown;

			if (ctx.mode === "tui") {
				rawMaterial = await ctx.ui.custom<{ text: string; usage: Usage } | null>((tui, theme, _keybindings, done) => {
					const loader = new BorderedLoader(tui, theme, `Generating annotated raw material with ${model.id}...`);
					loader.onAbort = () => done(null);
					generateRawMaterial(loader.signal)
						.then(done)
						.catch((error) => {
							generationError = error;
							done(null);
						});
					return loader;
				});
			} else {
				try {
					rawMaterial = await generateRawMaterial();
				} catch (error) {
					generationError = error;
				}
			}

			if (!rawMaterial) {
				const message = generationError instanceof Error ? generationError.message : "Raw-material generation cancelled";
				reportProgress(message, generationError ? "error" : "active");
				if (ctx.hasUI) ctx.ui.notify(message, generationError ? "error" : "info");
				return;
			}

			reportProgress("Handing raw material to the main agent", "success");

			// Account for the isolated agent on the next main-agent response. Pi includes
			// assistant-message usage in the footer, /session, and RPC session totals.
			pendingSubagentUsage = pendingSubagentUsage
				? mergeUsage(pendingSubagentUsage, rawMaterial.usage)
				: rawMaterial.usage;

			// This is the second call: a normal user message handled by Pi's main agent.
			// It is persisted in the session, so it and the resulting answer become part
			// of the stable prefix available to provider prompt caching on later turns.
			try {
				pi.sendUserMessage(promptTwo(question, rawMaterial.text));
			} catch (error) {
				pendingSubagentUsage = undefined;
				throw error;
			}
		},
	});
}
