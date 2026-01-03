import { initWasm } from "@resvg/resvg-wasm";
import WASM_RESVG from "@resvg/resvg-wasm/index_bg.wasm";
import type {
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
	APIInteractionResponse,
	APIMessageApplicationCommandInteraction,
	APIUserApplicationCommandInteraction,
} from "discord-api-types/v10";
import {
	ApplicationCommandType,
	InteractionResponseType,
	InteractionType,
} from "discord-api-types/v10";
import { Hono } from "hono";
import { init as initSatori } from "satori/wasm";
import initYoga from "yoga-wasm-web";
import WASM_YOGA from "yoga-wasm-web/dist/yoga.wasm";

import { interactionVerifier } from "./discord";
import {
	handleMessageCommand,
	handleModalSubmit,
	handleSlashCommand,
	handleUserCommand,
} from "./handler";
import { generateImage } from "./image";

const yoga = await initYoga(WASM_YOGA);
initSatori(yoga);

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
				switch (interaction.data.type) {
					case ApplicationCommandType.ChatInput: {
						const res = handleSlashCommand(
							interaction as APIChatInputApplicationCommandInteraction,
						);

						return c.json(res);
					}
					case ApplicationCommandType.Message: {
						const res = handleMessageCommand(
							interaction as APIMessageApplicationCommandInteraction,
							c.env,
							c.executionCtx,
						);
						return c.json(res);
					}
					case ApplicationCommandType.User: {
						const res = handleUserCommand(
							interaction as APIUserApplicationCommandInteraction,
						);

						return c.json(res);
					}
				}

				break;
			case InteractionType.ModalSubmit: {
				const res = handleModalSubmit(interaction, c.env, c.executionCtx);

				return c.json(res);
			}
		}

		return c.text("Unknown interaction type", 400);
	});

export default app;
