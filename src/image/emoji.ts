import { encodeBase64 } from "../utils";

// ZWJ: Zero Width Joiner
// eslint-disable-next-line unicorn/prefer-code-point
const ZWJ = String.fromCharCode(0x20_0d);
// EPVS: VARIATION SELECTOR-16
const EPVS_REGEX = /\uFE0F/gu;

function getIconCode(segment: string): string {
	// ZWJが含まれない単独の絵文字の場合、末尾のEPVSが含まれるとURLが見つからないため削除する
	const str = !segment.includes(ZWJ)
		? segment.replaceAll(EPVS_REGEX, "")
		: segment;

	// eslint-disable-next-line typescript/no-misused-spread
	const codePoints = [...str]
		.map((c) => c.codePointAt(0)!.toString(16))
		.join("-");

	return codePoints;
}

export async function loadEmoji(segment: string): Promise<string> {
	const code = getIconCode(segment);
	const url = `https://cdn.jsdelivr.net/gh/jdecked/twemoji@latest/assets/svg/${code.toLowerCase()}.svg`;

	const res = await fetch(url);
	const base64 = encodeBase64(await res.arrayBuffer());

	return `data:image/svg+xml;base64,${base64}`;
}
