import {
	ContextMenuCommandBuilder,
	SlashCommandBuilder,
} from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { ApplicationCommandType, Routes } from "discord-api-types/v10";

const pingSlashCommand = new SlashCommandBuilder()
	.setName("ping")
	.setDescription("pingをBotに送ります。");

const quoteSlashCommand = new SlashCommandBuilder()
	.setName("quote")
	.setDescription("任意のユーザーの名言画像を生成します。")
	.addUserOption((option) =>
		option
			.setName("user")
			.setDescription("名言を生成するユーザーを指定します。")
			.setRequired(true),
	)
	.addStringOption((option) =>
		option
			.setName("text")
			.setDescription("名言のテキストを指定します。")
			.setRequired(true),
	);

const quoteMessageCommand = new ContextMenuCommandBuilder()
	.setType(ApplicationCommandType.Message)
	.setName("quote");

const token = process.env["DISCORD_BOT_TOKEN"];
const applicationId = process.env["DISCORD_APPLICATION_ID"];
const guildId = process.env["DISCORD_GUILD_ID"];

if (!token || !applicationId) {
	throw new Error("DISCORD_TOKEN or DISCORD_APPLICATION_ID is not set");
}

const commands = [
	pingSlashCommand.toJSON(),
	quoteSlashCommand.toJSON(),
	quoteMessageCommand.toJSON(),
];

const rest = new REST({ version: "10" }).setToken(token);

if (guildId != null) {
	await rest.put(Routes.applicationGuildCommands(applicationId, guildId), {
		body: commands,
	});
} else {
	const a = await rest.put(Routes.applicationCommands(applicationId), {
		body: commands,
	});
	console.log(a);
}

const a = await rest.get(Routes.applicationCommands(applicationId));
console.log(a);

console.log("Commands registered successfully");
