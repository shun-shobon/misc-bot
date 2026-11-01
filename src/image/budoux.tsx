import { jaModel, Parser } from "budoux";
import type { ReactNode } from "react";

// Cloudflare Workers 対応のため、HTMLProcessor を使わず Parser を直接使用
const jaParser = new Parser(jaModel);

/**
 * テキストを budoux で分かち書きし、span 要素の配列として返す
 */
export function segmentText(text: string): ReactNode[] {
	if (text === "") {
		return [];
	}

	const phrases = jaParser.parse(text);

	// oxlint-disable-next-line react/no-array-index-key -- 同じ文節が複数回現れ得て、並べ替えも起きないため位置が唯一の識別子になる
	return phrases.map((phrase, index) => <span key={`segment-${index}`}>{phrase}</span>);
}
