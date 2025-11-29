import { calculateUserDefaultAvatarIndex, REST } from "@discordjs/rest";
import type {
	APIChatInputApplicationCommandInteraction,
	APIGuildMember,
	APIInteractionResponse,
	APIMessageApplicationCommandInteraction,
	APIMessageTopLevelComponent,
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

export function handleMessageCommand(
	interaction: APIMessageApplicationCommandInteraction,
	env: Env,
	ctx: ExecutionContext,
): APIInteractionResponse {
	switch (interaction.data.name) {
		case "quote":
			return handleQuoteMessageCommand(env, interaction, ctx);
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

export function handleModalSubmit(
	interaction: APIModalSubmitInteraction,
	env: Env,
	ctx: ExecutionContext,
): APIInteractionResponse {
	const customId = interaction.data.custom_id;
	const [command, ...rest] = customId.split(":");

	switch (command) {
		case "quote": {
			const userId = rest[0]!;

			return handleQuoteModalSubmit(interaction, userId, env, ctx);
		}
	}

	return createErrorMessage();
}

function handleQuoteModalSubmit(
	interaction: APIModalSubmitInteraction,
	userId: string,
	env: Env,
	ctx: ExecutionContext,
): APIInteractionResponse {
	const textInput = (
		interaction.data.components[0] as ModalSubmitLabelComponent
	).component as APIModalSubmitTextInputComponent;
	if (textInput.custom_id !== "text") {
		throw new Error("Invalid custom id");
	}

	const text = textInput.value;

	enqueueFollowUp(ctx, async () => {
		await sendQuoteFollowUp({
			interaction,
			env,
			memberId: userId,
			text,
		});
	});

	return createDeferredMessage();
}

function handleQuoteMessageCommand(
	env: Env,
	interaction: APIMessageApplicationCommandInteraction,
	ctx: ExecutionContext,
): APIInteractionResponse {
	const message =
		interaction.data.resolved.messages[interaction.data.target_id]!;

	enqueueFollowUp(ctx, async () => {
		await sendQuoteFollowUp({
			interaction,
			env,
			memberId: message.author.id,
			text: message.content,
		});
	});

	return createDeferredMessage();
}

function enqueueFollowUp(
	ctx: ExecutionContext,
	promiseFactory: () => Promise<void>,
): void {
	ctx.waitUntil(
		(async () => {
			try {
				await promiseFactory();
			} catch (error) {
				console.error("Failed to send quote follow-up", error);
			}
		})(),
	);
}

async function sendQuoteFollowUp({
	interaction,
	env,
	memberId,
	text,
}: {
	interaction:
		| APIModalSubmitInteraction
		| APIMessageApplicationCommandInteraction;
	env: Env;
	memberId: string;
	text: string;
}): Promise<void> {
	const rest = new REST({ version: "10" }).setToken(env.DISCORD_BOT_TOKEN);

	try {
		const member = (await rest.get(
			Routes.guildMember(env.DISCORD_GUILD_ID, memberId),
		)) as APIGuildMember;
		const mentionNames = await resolveMentionDisplayNames({
			rest,
			env,
			text,
			selfMember: member,
		});

		const iconUrl = getIconUrl(env, rest, member);

		const image = await generateImage({
			iconUrl,
			text,
			name: member.nick ?? member.user.global_name ?? member.user.username,
			id: member.user.username,
			mentionNames,
		});

		await rest.patch(
			Routes.webhookMessage(interaction.application_id, interaction.token),
			{
				body: {
					attachments: [
						{
							id: 0,
							filename: "quote.png",
						},
					],
				},
				files: [
					{
						data: image,
						name: "image.png",
					},
				],
			},
		);
	} catch (error) {
		await sendErrorFollowUp(rest, interaction, error);
	}
}

async function sendErrorFollowUp(
	rest: REST,
	interaction:
		| APIModalSubmitInteraction
		| APIMessageApplicationCommandInteraction,
	error: unknown,
): Promise<void> {
	console.error("Failed to send error follow-up", error);
	const message =
		error instanceof Error ? (error.stack ?? error.message) : String(error);

	const component: APIMessageTopLevelComponent = {
		type: ComponentType.Container,
		accent_color: 0xff_33_33,
		components: [
			{
				type: ComponentType.TextDisplay,
				content: [
					"### エラーが発生しました <@361444721538891776>",
					"```",
					message,
					"```",
				].join("\n"),
			},
		],
	};

	await rest.patch(
		Routes.webhookMessage(interaction.application_id, interaction.token),
		{
			body: {
				flags: MessageFlags.IsComponentsV2,
				components: [component],
			},
		},
	);
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

function extractMentionUserIds(text: string): string[] {
	const pattern = /<@!?(?<id>\d+)>/gu;
	const ids = new Set<string>();
	let match: RegExpExecArray | null;

	while ((match = pattern.exec(text)) != null) {
		const id = match.groups?.["id"];
		if (id != null) {
			ids.add(id);
		}
	}

	return [...ids];
}

async function resolveMentionDisplayNames({
	rest,
	env,
	text,
	selfMember,
}: {
	rest: REST;
	env: Env;
	text: string;
	selfMember: APIGuildMember;
}): Promise<Record<string, string>> {
	const ids = extractMentionUserIds(text);
	if (ids.length === 0) {
		return {};
	}

	const mentionNames: Record<string, string> = {};

	// 既に取得済みの対象メンバーを再利用
	mentionNames[selfMember.user.id] =
		selfMember.nick ?? selfMember.user.global_name ?? selfMember.user.username;
	for (const id of ids) {
		if (mentionNames[id] != null) {
			continue;
		}

		try {
			const member = (await rest.get(
				Routes.guildMember(env.DISCORD_GUILD_ID, id),
			)) as APIGuildMember;
			mentionNames[id] =
				member.nick ?? member.user.global_name ?? member.user.username;
		} catch (error) {
			console.warn("Failed to resolve mention", { id, error });
			mentionNames[id] = "unknown";
		}
	}

	return mentionNames;
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

function createDeferredMessage(): APIInteractionResponse {
	return {
		type: InteractionResponseType.DeferredChannelMessageWithSource,
	};
}

function createErrorMessage(): APIInteractionResponse {
	const component: APIMessageTopLevelComponent = {
		type: ComponentType.Container,
		accent_color: 0xff_33_33,
		components: [
			{
				type: ComponentType.TextDisplay,
				content: [
					"### エラーが発生しました <@361444721538891776>",
					"存在しないコマンドが実行されました。",
				].join("\n"),
			},
		],
	};

	return {
		type: InteractionResponseType.ChannelMessageWithSource,
		data: {
			flags: MessageFlags.IsComponentsV2,
			components: [component],
		},
	};
}
