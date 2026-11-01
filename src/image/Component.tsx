import type { Child } from "hono/jsx";
import type { JSX } from "hono/jsx/jsx-runtime";

import { withTwemoji } from "./emoji";

export const WIDTH = 1200;
export const HEIGHT = 630;
export const READY_SELECTOR = "body[data-ready]";

const BASE_FONT_SIZE = 32;
const MIN_FONT_SIZE = 12;

const FONT_URL =
	"https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@400;700&family=Noto+Sans+Mono&display=block";

const STYLE = `
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body { width: ${WIDTH}px; height: ${HEIGHT}px; overflow: hidden; }
body {
	display: flex;
	background: #000;
	color: #fafafa;
	font-family: "Noto Sans JP", sans-serif;
	font-size: ${BASE_FONT_SIZE}px;
	line-height: 1.5;
	word-break: auto-phrase;
	overflow-wrap: anywhere;
}
.icon {
	flex: none;
	width: 40%;
	height: 100%;
	object-fit: cover;
	filter: grayscale(100%);
	mask-image: linear-gradient(to right, white 70%, transparent 100%);
}
.main {
	flex: 1;
	min-width: 0;
	padding: 32px;
	display: flex;
	flex-direction: column;
	justify-content: center;
	align-items: center;
	gap: 24px;
}
.content {
	flex: 0 1 auto;
	min-height: 0;
	width: 100%;
	overflow: hidden;
	display: flex;
	flex-direction: column;
	gap: 0.375em;
	text-align: center;
}
h1 { font-size: 1.3125em; }
h2 { font-size: 1.1875em; }
h3 { font-size: 1.0625em; }
strong, h1, h2, h3, .mention { font-weight: 700; }
em { font-style: italic; }
del { text-decoration: line-through; }
code, pre { font-family: "Noto Sans Mono", "Noto Sans JP", monospace; }
code {
	font-size: 0.875em;
	background: #1c1c1c;
	padding: 0.0625em 0.1875em;
	border-radius: 4px;
}
pre {
	font-size: 0.875em;
	background: #111;
	padding: 0.375em;
	border-radius: 8px;
	text-align: left;
	white-space: pre-wrap;
}
pre code { font-size: 1em; background: none; padding: 0; }
blockquote {
	border-left: 4px solid #666;
	padding-left: 0.375em;
	color: #e0e0e0;
	text-align: left;
}
ul { padding-left: 1.2em; text-align: left; }
.link { color: #7cc7ff; text-decoration: underline; }
.mention {
	background: #1f1f1f;
	padding: 0 0.1875em;
	border-radius: 6px;
	color: #cfd9ff;
}
.spoiler {
	border: 1px solid #555;
	border-radius: 6px;
	padding: 0 0.25em;
	background: rgba(255, 255, 255, 0.05);
	box-decoration-break: clone;
}
.emoji { width: 1.2em; height: 1.2em; object-fit: contain; vertical-align: middle; }
.jumbo .emoji { width: 2.6em; height: 2.6em; }
.author {
	flex: none;
	display: flex;
	flex-direction: column;
	align-items: center;
	gap: 4px;
	text-align: center;
}
.name { font-size: 24px; }
.id { font-size: 20px; opacity: 0.65; }
`;

const FIT_SCRIPT = `
addEventListener("load", async () => {
	try {
		// レイアウトを確定させてから待たないと、使われるフォントの読み込みが始まっておらず即座に解決してしまう
		document.body.offsetHeight;
		await document.fonts.ready;
		const content = document.querySelector(".content");
		let size = ${BASE_FONT_SIZE};
		while (content.scrollHeight > content.clientHeight && size > ${MIN_FONT_SIZE}) {
			size -= 1;
			content.style.fontSize = size + "px";
		}
	} finally {
		document.body.dataset.ready = "";
	}
});
`;

interface Props {
	iconUrl: string;
	content: Child;
	jumbo: boolean;
	name: string;
	id: string;
}

export function Page({ iconUrl, content, jumbo, name, id }: Props): JSX.Element {
	return (
		<html lang="ja">
			<head>
				<meta charset="utf-8" />
				<link rel="stylesheet" href={FONT_URL} />
				<style dangerouslySetInnerHTML={{ __html: STYLE }} />
			</head>
			<body>
				<img class="icon" src={iconUrl} alt="" />
				<main class="main">
					<div class={jumbo ? "content jumbo" : "content"}>{content}</div>
					<div class="author">
						<span class="name">{withTwemoji(name)}</span>
						<span class="id">@{id}</span>
					</div>
				</main>
				<script dangerouslySetInnerHTML={{ __html: FIT_SCRIPT }} />
			</body>
		</html>
	);
}
