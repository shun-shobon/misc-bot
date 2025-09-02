import { Resvg } from "@resvg/resvg-wasm";
import satori from "satori/wasm";

import { encodeBase64 } from "../utils";
import { Component } from "./Component";
import { loadEmoji } from "./emoji";
import { fetchFont } from "./font";

interface Params {
	iconUrl: string;
	text: string;
	name: string;
	id: string;
}

export async function generateImage(params: Params): Promise<Uint8Array> {
	const text = `${params.text}${params.name}${params.id}@`;

	const [font, iconSrc] = await Promise.all([
		fetchFont(text, "Noto Sans JP", 400),
		fetchIcon(params.iconUrl),
	]);

	const svg = await satori(
		<Component
			iconSrc={iconSrc}
			text={params.text}
			name={params.name}
			id={params.id}
		/>,
		{
			width: 1200,
			height: 630,
			fonts: [
				{
					name: "Noto Sans JP",
					data: font,
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
