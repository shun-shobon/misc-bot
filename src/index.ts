import { initWasm } from "@resvg/resvg-wasm";
import WASM_RESVG from "@resvg/resvg-wasm/index_bg.wasm";
import type {
	APIChatInputApplicationCommandInteraction,
	APIInteraction,
	APIInteractionResponse,
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
import { handleSlashCommand } from "./handler";

const yoga = await initYoga(WASM_YOGA);
initSatori(yoga);

await initWasm(WASM_RESVG);

const app = new Hono<{ Bindings: Env }>();

app
	.get("/", (c) => c.text("Hello, World!"))
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
						const res = await handleSlashCommand(
							c.env,
							interaction as APIChatInputApplicationCommandInteraction,
						);

						if (res instanceof Response) {
							return res;
						}

						return c.json(res);
					}
				}
		}

		return c.text("Unknown interaction type", 400);
	});

export default app;
