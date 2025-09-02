import { calculateUserDefaultAvatarIndex, REST } from "@discordjs/rest";
import type {
	APIChatInputApplicationCommandInteraction,
	APIGuildMember,
	APIInteractionResponse,
	APIMessageApplicationCommandInteraction,
} from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	InteractionResponseType,
	Routes,
} from "discord-api-types/v10";
import { match, P } from "ts-pattern";

import { parseCommand } from "./discord";
import { generateImage } from "./image";

export async function handleSlashCommand(
	env: Env,
	interaction: APIChatInputApplicationCommandInteraction,
): Promise<APIInteractionResponse | Response> {
	const result = parseCommand(interaction.data);

	const response = match(result)
		.with(
			{ commands: ["ping"] },
			(): APIInteractionResponse => ({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "pong!",
				},
			}),
		)
		.with(
			{
				commands: ["quote"],
				options: {
					user: P.when((o) => o.type === ApplicationCommandOptionType.User),
					text: P.when((o) => o.type === ApplicationCommandOptionType.String),
				},
			},
			async ({ options: { user, text } }) => {
				const userId = user.value;
				const textValue = text.value;

				return await handleQuoteSlashCommand(env, userId, textValue);
			},
		)
		.with(
			P._,
			(): APIInteractionResponse => ({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "未知のコマンドです。",
				},
			}),
		)
		.exhaustive();

	return await response;
}

export async function handleMessageCommand(
	env: Env,
	interaction: APIMessageApplicationCommandInteraction,
): Promise<APIInteractionResponse | Response> {
	switch (interaction.data.name) {
		case "quote":
			return await handleQuoteMessageCommand(env, interaction);
	}

	const res: APIInteractionResponse = {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			content: "未知のコマンドです。",
		},
	};
	return res;
}

async function handleQuoteSlashCommand(env: Env, userId: string, text: string) {
	const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

	const member = (await rest.get(
		Routes.guildMember(env.DISCORD_GUILD_ID, userId),
	)) as APIGuildMember;

	const iconUrl = getIconUrl(env, rest, member);

	const image = await generateImage({
		iconUrl,
		text,
		name: member.nick ?? member.user.global_name ?? member.user.username,
		id: member.user.username,
	});

	const formData = new FormData();

	const payload: APIInteractionResponse = {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			attachments: [
				{
					id: 0,
					filename: "quote.png",
				},
			],
		},
	};

	formData.set("payload_json", JSON.stringify(payload));
	formData.set(
		"files[0]",
		new Blob([image], { type: "image/png" }),
		"image.png",
	);

	return new Response(formData, { status: 200 });
}

async function handleQuoteMessageCommand(
	env: Env,
	interaction: APIMessageApplicationCommandInteraction,
) {
	const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

	const message =
		interaction.data.resolved.messages[interaction.data.target_id]!;
	const member = (await rest.get(
		Routes.guildMember(env.DISCORD_GUILD_ID, message.author.id),
	)) as APIGuildMember;

	const text = message.content;
	const iconUrl = getIconUrl(env, rest, member);

	const image = await generateImage({
		iconUrl,
		text,
		name: member.nick ?? member.user.global_name ?? member.user.username,
		id: member.user.username,
	});

	const formData = new FormData();

	const payload: APIInteractionResponse = {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			attachments: [
				{
					id: 0,
					filename: "quote.png",
				},
			],
		},
	};

	formData.set("payload_json", JSON.stringify(payload));
	formData.set(
		"files[0]",
		new Blob([image], { type: "image/png" }),
		"image.png",
	);

	return new Response(formData, { status: 200 });
}

function getIconUrl(env: Env, rest: REST, member: APIGuildMember) {
	if (member.avatar != null) {
		return rest.cdn.guildMemberAvatar(
			env.DISCORD_GUILD_ID,
			member.user.id,
			member.avatar,
			{ size: 512, extension: "png" },
		);
	}

	if (member.user.avatar != null) {
		return rest.cdn.avatar(member.user.id, member.user.avatar, {
			size: 512,
			extension: "png",
		});
	}

	return rest.cdn.defaultAvatar(
		calculateUserDefaultAvatarIndex(member.user.id),
	);
}
