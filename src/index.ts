import { initWasm } from "@resvg/resvg-wasm";
import WASM_RESVG from "@resvg/resvg-wasm/index_bg.wasm";
import { isChatInputApplicationCommandInteraction } from "discord-api-types/utils/v10";
import type { APIInteraction, APIInteractionResponse } from "discord-api-types/v10";
import { InteractionResponseType, InteractionType } from "discord-api-types/v10";
import { Hono } from "hono";
import { init as initSatori } from "satori/standalone";
import WASM_SATORI from "satori/yoga.wasm";

import {
	interactionVerifier,
	isMessageCommandInteraction,
	isUserCommandInteraction,
} from "./discord";
import {
	handleMessageCommand,
	handleModalSubmit,
	handleSlashCommand,
	handleUserCommand,
} from "./handler";
import { generateImage } from "./image";

await initSatori(WASM_SATORI);

await initWasm(WASM_RESVG);

const app = new Hono<{ Bindings: Env }>();

app
	.get("/", (c) => c.text("Hello, World!"))
	.get("/preview", async (c) => {
		const image = await generateImage({
			iconUrl: c.req.query("iconUrl") ?? "https://github.com/shun-shobon.png",
			text:
				c.req.query("text") ??
				"# h1\n## h2\n### h3\n---\n**bold** _italic_ ~~strikethrough~~ `inline code`\n長野高専東京タワーの上にあるからな",
			name: c.req.query("name") ?? "SHUN",
			id: c.req.query("id") ?? "shun_shobon",
		});
		return new Response(image, {
			headers: { "Content-Type": "image/png" },
		});
	})
	.post("/interactions", interactionVerifier, async (c) => {
		const interaction: APIInteraction = await c.req.json();

		switch (interaction.type) {
			case InteractionType.Ping:
				return c.json<APIInteractionResponse>({
					type: InteractionResponseType.Pong,
				});
			case InteractionType.ApplicationCommand:
				if (isChatInputApplicationCommandInteraction(interaction)) {
					return c.json(handleSlashCommand(interaction));
				}
				if (isMessageCommandInteraction(interaction)) {
					return c.json(handleMessageCommand(interaction, c.env, c.executionCtx));
				}
				if (isUserCommandInteraction(interaction)) {
					return c.json(handleUserCommand(interaction));
				}

				break;
			case InteractionType.ModalSubmit: {
				const res = handleModalSubmit(interaction, c.env, c.executionCtx);

				return c.json(res);
			}
			case InteractionType.MessageComponent:
			case InteractionType.ApplicationCommandAutocomplete:
				break;
		}

		return c.text("Unknown interaction type", 400);
	});

export default app;
