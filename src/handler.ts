import { calculateUserDefaultAvatarIndex, REST } from "@discordjs/rest";
import type {
	APIChatInputApplicationCommandInteraction,
	APIGuildMember,
	APIInteractionResponse,
	APIMessageApplicationCommandInteraction,
	APIModalSubmitInteraction,
	APIModalSubmitTextInputComponent,
	APIUserApplicationCommandInteraction,
	ModalSubmitLabelComponent,
} from "discord-api-types/v10";
import {
	ApplicationCommandOptionType,
	ComponentType,
	InteractionResponseType,
	MessageFlags,
	Routes,
	TextInputStyle,
} from "discord-api-types/v10";
import { match, P } from "ts-pattern";

import { parseCommand } from "./discord";
import { generateImage } from "./image";

export function handleSlashCommand(
	interaction: APIChatInputApplicationCommandInteraction,
): APIInteractionResponse {
	const result = parseCommand(interaction.data);

	const response = match(result)
		.with(
			{ commands: ["ping"] },
			(): APIInteractionResponse => ({
				type: InteractionResponseType.ChannelMessageWithSource,
				data: {
					content: "pong!",
					flags: MessageFlags.Ephemeral,
				},
			}),
		)
		.with(
			{
				commands: ["quote"],
				options: {
					user: P.when((o) => o.type === ApplicationCommandOptionType.User),
				},
			},
			({ options: { user } }) => createQuoteModal(user.value),
		)
		.with(P._, (): APIInteractionResponse => createErrorMessage())
		.exhaustive();

	return response;
}

export async function handleMessageCommand(
	interaction: APIMessageApplicationCommandInteraction,
	env: Env,
): Promise<APIInteractionResponse | Response> {
	switch (interaction.data.name) {
		case "quote":
			return await handleQuoteMessageCommand(env, interaction);
	}

	return createErrorMessage();
}

export function handleUserCommand(
	interaction: APIUserApplicationCommandInteraction,
): APIInteractionResponse {
	switch (interaction.data.name) {
		case "quote":
			return createQuoteModal(interaction.data.target_id);
	}

	return createErrorMessage();
}

export async function handleModalSubmit(
	interaction: APIModalSubmitInteraction,
	env: Env,
): Promise<APIInteractionResponse | Response> {
	const customId = interaction.data.custom_id;
	const [command, ...rest] = customId.split(":");

	switch (command) {
		case "quote": {
			const userId = rest[0]!;

			return await handleQuoteModalSubmit(interaction, userId, env);
		}
	}

	return createErrorMessage();
}

async function handleQuoteModalSubmit(
	interaction: APIModalSubmitInteraction,
	userId: string,
	env: Env,
) {
	const textInput = (
		interaction.data.components[0] as ModalSubmitLabelComponent
	).component as APIModalSubmitTextInputComponent;
	if (textInput.custom_id !== "text") {
		throw new Error("Invalid custom id");
	}

	const text = textInput.value;

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

function createQuoteModal(userId: string): APIInteractionResponse {
	return {
		type: InteractionResponseType.Modal,
		data: {
			custom_id: `quote:${userId}`,
			title: "名言画像を生成",
			components: [
				{
					type: ComponentType.Label,
					label: "内容",
					component: {
						type: ComponentType.TextInput,
						custom_id: "text",
						style: TextInputStyle.Paragraph,
					},
				},
			],
		},
	};
}

function createErrorMessage(): APIInteractionResponse {
	return {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			content: "# このメッセージが 見れるのは おかしいよ",
			flags: MessageFlags.Ephemeral,
		},
	};
}
