import type {
	APIApplicationCommandInteractionDataOption,
	APIApplicationCommandInteractionDataSubcommandGroupOption,
	APIApplicationCommandInteractionDataSubcommandOption,
	APIChatInputApplicationCommandInteractionData,
	InteractionType,
} from "discord-api-types/v10";
import { ApplicationCommandOptionType } from "discord-api-types/v10";
import { verifyKey } from "discord-interactions";
import { createMiddleware } from "hono/factory";

export const interactionVerifier = createMiddleware<{ Bindings: Env }>(
	async (c, next) => {
		const signature = c.req.header("X-Signature-Ed25519");
		const timestamp = c.req.header("X-Signature-Timestamp");
		if (!signature || !timestamp) {
			return c.text("Invalid request", 400);
		}

		const body = await c.req.text();
		const isValid = await verifyKey(
			body,
			signature,
			timestamp,
			c.env.DISCORD_PUBLIC_KEY,
		);

		if (!isValid) {
			return c.text("Unauthorized", 401);
		}

		await next();
		return undefined;
	},
);

type Option = Exclude<
	APIApplicationCommandInteractionDataOption<InteractionType.ApplicationCommand>,
	| APIApplicationCommandInteractionDataSubcommandGroupOption<InteractionType.ApplicationCommand>
	| APIApplicationCommandInteractionDataSubcommandOption<InteractionType.ApplicationCommand>
>;

export function parseCommand(
	interactionData: APIChatInputApplicationCommandInteractionData,
): {
	commands: string[];
	options: Record<string, Option>;
} {
	const commands = [interactionData.name];
	let options: Record<string, Option> = {};

	const result = parseOptionsRecursive(interactionData.options ?? []);
	commands.push(...result.commands);
	options = { ...options, ...result.options };

	return { commands, options };
}

function parseOptionsRecursive(
	apiOptions: APIApplicationCommandInteractionDataOption<InteractionType.ApplicationCommand>[],
): {
	commands: string[];
	options: Record<string, Option>;
} {
	const commands: string[] = [];
	let options: Record<string, Option> = {};

	for (const apiOption of apiOptions) {
		if (
			apiOption.type === ApplicationCommandOptionType.SubcommandGroup ||
			apiOption.type === ApplicationCommandOptionType.Subcommand
		) {
			commands.push(apiOption.name);
			const subOptionsResult = parseOptionsRecursive(apiOption.options ?? []);
			commands.push(...subOptionsResult.commands);
			options = { ...options, ...subOptionsResult.options };
		} else {
			options[apiOption.name] = apiOption;
		}
	}

	return { commands, options };
}
