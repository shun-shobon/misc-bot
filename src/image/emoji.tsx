import type { Child } from "hono/jsx";

const TWEMOJI_BASE_URL = "https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.3/assets/svg";

// ZWJ: Zero Width Joiner
const ZWJ = "\u200D";
// EPVS: VARIATION SELECTOR-16
const EPVS_REGEX = /\uFE0F/gu;
const EMOJI_REGEX = /\p{RGI_Emoji}/gv;

export function twemojiUrl(segment: string): string {
	// ZWJが含まれない単独の絵文字の場合、末尾のEPVSが含まれるとURLが見つからないため削除する
	const str = segment.includes(ZWJ) ? segment : segment.replaceAll(EPVS_REGEX, "");

	// oxlint-disable-next-line typescript/no-misused-spread -- 絵文字をコードポイント単位に分解したいので、文字列のスプレッドが意図どおり
	const code = [...str].map((c) => c.codePointAt(0)!.toString(16)).join("-");

	return `${TWEMOJI_BASE_URL}/${code}.svg`;
}

/**
 * テキスト中の絵文字を Twemoji の img 要素に置き換える
 */
export function withTwemoji(text: string): Child[] {
	const children: Child[] = [];
	let lastIndex = 0;

	for (const match of text.matchAll(EMOJI_REGEX)) {
		if (match.index > lastIndex) {
			children.push(text.slice(lastIndex, match.index));
		}
		children.push(<img class="emoji" src={twemojiUrl(match[0])} alt={match[0]} />);
		lastIndex = match.index + match[0].length;
	}

	if (lastIndex < text.length) {
		children.push(text.slice(lastIndex));
	}

	return children;
}
