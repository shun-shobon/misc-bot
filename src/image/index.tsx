import { Resvg } from "@resvg/resvg-wasm";
import satori from "satori/wasm";

import { encodeBase64 } from "../utils";
import { Component } from "./Component";
import { loadEmoji } from "./emoji";
import { fetchFont } from "./font";
import type { MentionMap } from "./markdown";
import { renderMarkdown } from "./markdown";

interface Params {
	iconUrl: string;
	text: string;
	name: string;
	id: string;
	mentionNames?: MentionMap;
}

export async function generateImage(params: Params): Promise<Uint8Array> {
	const mentionNames = params.mentionNames ?? {};
	const textSeed = `${params.text}${params.name}${params.id}@${Object.values(mentionNames).join("")}`;

	const content = await renderMarkdown(params.text, {
		mentionNames,
		loadCustomEmoji,
	});

	const [fontRegular, fontBold, fontMono, iconSrc] = await Promise.all([
		fetchFont(textSeed, "Noto Sans JP", 400),
		fetchFont(textSeed, "Noto Sans JP", 700),
		fetchFont(textSeed, "Noto Sans Mono", 400),
		fetchIcon(params.iconUrl),
	]);

	const svg = await satori(
		<Component
			iconSrc={iconSrc}
			content={content}
			name={params.name}
			id={params.id}
		/>,
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: "Noto Sans JP",
					data: fontRegular,
					weight: 400,
				},
				{
					name: "Noto Sans JP",
					data: fontBold,
					weight: 700,
				},
				{
					name: "Noto Sans Mono",
					data: fontMono,
					weight: 400,
				},
			],
			async loadAdditionalAsset(code, segment) {
				if (code === "emoji") {
					return await loadEmoji(segment);
				}

				return segment;
			},
		},
	);

	const resvg = new Resvg(svg, {
		background: "transparent",
	});
	resvg.cropByBBox(resvg.innerBBox()!);
	const img = resvg.render().asPng();

	return img;
}

async function fetchIcon(iconSrc: string): Promise<string> {
	const res = await fetch(iconSrc);
	if (!res.ok) {
		throw new Error("Failed to fetch icon");
	}

	const blob = await res.blob();
	const base64 = encodeBase64(await blob.arrayBuffer());

	return `data:${blob.type};base64,${base64}`;
}

const customEmojiCache = new Map<string, string>();

async function loadCustomEmoji(id: string, animated: boolean): Promise<string> {
	const key = `${id}:${animated ? "a" : "s"}`;
	const cached = customEmojiCache.get(key);
	if (cached != null) {
		return cached;
	}

	const ext = animated ? "gif" : "png";
	const url = `https://cdn.discordapp.com/emojis/${id}.${ext}`;
	const res = await fetch(url);

	if (!res.ok && animated) {
		// アニメGIFが無い場合はPNGをフォールバック
		return await loadCustomEmoji(id, false);
	}

	if (!res.ok) {
		throw new Error(`Failed to fetch custom emoji: ${id}`);
	}

	const blob = await res.blob();
	const base64 = encodeBase64(await blob.arrayBuffer());
	const dataUrl = `data:${blob.type};base64,${base64}`;

	customEmojiCache.set(key, dataUrl);

	return dataUrl;
}
