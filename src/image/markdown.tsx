import type {
	Capture,
	Parser,
	ParserRules,
	State,
} from "@khanacademy/simple-markdown";
import SimpleMarkdown from "@khanacademy/simple-markdown";
import type { ReactNode } from "react";

type MentionMap = Record<string, string>;

interface TextNode {
	type: "text";
	content: string;
}

interface ParagraphNode {
	type: "paragraph";
	content: MarkdownNode[];
}

interface HeadingNode {
	type: "heading";
	level: number;
	content: MarkdownNode[];
}

interface EmphasisNode {
	type: "em" | "strong" | "del";
	content: MarkdownNode[];
}

interface InlineCodeNode {
	type: "inlineCode";
	content: string;
}

interface CodeBlockNode {
	type: "codeBlock";
	content: string;
}

interface BlockQuoteNode {
	type: "blockQuote";
	content: MarkdownNode[];
}

interface ListNode {
	type: "list";
	items: MarkdownNode[][];
}

interface LinkNode {
	type: "link";
	content: MarkdownNode[];
	target?: string;
}

interface SpoilerNode {
	type: "spoiler";
	content: MarkdownNode[];
}

interface MentionNode {
	type: "mention";
	userId: string;
}

interface CustomEmojiNode {
	type: "customEmoji";
	id: string;
	animated: boolean;
}

type MarkdownNode =
	| TextNode
	| ParagraphNode
	| HeadingNode
	| EmphasisNode
	| InlineCodeNode
	| CodeBlockNode
	| BlockQuoteNode
	| ListNode
	| LinkNode
	| SpoilerNode
	| MentionNode
	| CustomEmojiNode;

type MarkdownAst = MarkdownNode[];

interface RenderContext {
	mentionNames: MentionMap;
	loadCustomEmoji: (id: string, animated: boolean) => Promise<string>;
}

const TEXT_ORDER = SimpleMarkdown.defaultRules.text.order;
const EM_ORDER = SimpleMarkdown.defaultRules.em.order;

const rules: ParserRules = {
	...(SimpleMarkdown.defaultRules as Omit<
		typeof SimpleMarkdown.defaultRules,
		"Array"
	>),
	mention: {
		order: TEXT_ORDER - 0.5,
		match: SimpleMarkdown.inlineRegex(/^<@!?(?<id>\d+)>/u),
		parse: (capture: Capture & { groups?: Record<string, string> }) => ({
			type: "mention",
			userId: capture.groups?.["id"] ?? capture[1],
		}),
	},
	customEmoji: {
		order: TEXT_ORDER - 0.4,
		match: SimpleMarkdown.inlineRegex(/^<(?<animated>a?):[^:>]+:(?<id>\d+)>/u),
		parse: (capture: Capture & { groups?: Record<string, string> }) => ({
			type: "customEmoji",
			animated: capture.groups?.["animated"] === "a",
			id: capture.groups?.["id"] ?? capture[2],
		}),
	},
	spoiler: {
		order: EM_ORDER - 0.1,
		match: SimpleMarkdown.inlineRegex(/^\|\|(?:(?!\|\|)[\s\S])+\|\|/u),
		parse: (capture: Capture, parse: Parser, state: State) => ({
			type: "spoiler",
			content: parse((capture[0] ?? "").slice(2, -2), state),
		}),
	},
};

const parser = SimpleMarkdown.parserFor(rules);

const styles = {
	root: {
		display: "flex",
		flexDirection: "column",
		alignItems: "stretch",
		gap: "12px",
		width: "100%",
		color: "#fafafa",
		textAlign: "center",
	},
	paragraph: {
		display: "flex",
		flexWrap: "wrap",
		alignItems: "baseline",
		justifyContent: "center",
		gap: "4px",
		fontSize: "32px",
		lineHeight: 1.5,
		wordBreak: "break-word",
	},
	heading: [
		{},
		{
			display: "flex",
			flexWrap: "wrap",
			alignItems: "baseline",
			gap: "6px",
			fontSize: "42px",
			fontWeight: 700,
		},
		{
			display: "flex",
			flexWrap: "wrap",
			alignItems: "baseline",
			gap: "6px",
			fontSize: "38px",
			fontWeight: 700,
		},
		{
			display: "flex",
			flexWrap: "wrap",
			alignItems: "baseline",
			gap: "6px",
			fontSize: "34px",
			fontWeight: 700,
		},
	],
	blockquote: {
		display: "flex",
		flexDirection: "column",
		gap: "6px",
		borderLeft: "4px solid #666",
		paddingLeft: "12px",
		color: "#e0e0e0",
	},
	list: {
		display: "flex",
		flexDirection: "column",
		gap: "6px",
		paddingLeft: "24px",
		lineHeight: 1.5,
	},
	strong: { fontWeight: 700 },
	em: { transform: "skew(-10deg)" },
	del: { textDecoration: "line-through" },
	inlineCode: {
		fontFamily: "'Noto Sans Mono', 'Noto Sans JP'",
		fontSize: "28px",
		backgroundColor: "#1c1c1c",
		padding: "2px 6px",
		borderRadius: "4px",
	},
	codeBlock: {
		display: "flex",
		fontFamily: "'Noto Sans Mono', 'Noto Sans JP'",
		fontSize: "28px",
		backgroundColor: "#111",
		padding: "12px",
		borderRadius: "8px",
		whiteSpace: "pre-wrap",
	},
	link: { color: "#7cc7ff", textDecoration: "underline" },
	mention: {
		backgroundColor: "#1f1f1f",
		padding: "2px 6px",
		borderRadius: "6px",
		color: "#cfd9ff",
		fontWeight: 600,
	},
	spoiler: {
		display: "flex",
		alignItems: "center",
		gap: "6px",
		border: "1px solid #555",
		borderRadius: "6px",
		padding: "4px 8px",
		backgroundColor: "rgba(255,255,255,0.05)",
	},
	spoilerLabel: {
		fontSize: "20px",
		fontWeight: 700,
		color: "#ffcc66",
		marginRight: "6px",
	},
	customEmoji: {
		height: "1.2em",
		width: "1.2em",
		objectFit: "contain",
		verticalAlign: "middle",
	},
} satisfies Record<string, React.CSSProperties | React.CSSProperties[]>;

async function renderNodes(
	nodes: MarkdownAst,
	ctx: RenderContext,
): Promise<ReactNode[]> {
	const rendered = await Promise.all(
		nodes.map(async (node) => await renderNode(node, ctx)),
	);
	return rendered.flat();
}

// eslint-disable-next-line complexity
async function renderNode(
	node: MarkdownNode,
	ctx: RenderContext,
): Promise<ReactNode | ReactNode[]> {
	switch (node.type) {
		case "text":
			return node.content;
		case "paragraph": {
			const children = await renderNodes(node.content, ctx);
			return <div style={styles.paragraph}>{children}</div>;
		}
		case "heading": {
			const children = await renderNodes(node.content, ctx);
			const style = styles.heading[node.level] ?? styles.heading[3];
			return <div style={{ ...styles.paragraph, ...style }}>{children}</div>;
		}
		case "strong": {
			const children = await renderNodes(node.content, ctx);
			return <span style={styles.strong}>{children}</span>;
		}
		case "em": {
			const children = await renderNodes(node.content, ctx);
			return <span style={styles.em}>{children}</span>;
		}
		case "del": {
			const children = await renderNodes(node.content, ctx);
			return <span style={styles.del}>{children}</span>;
		}
		case "inlineCode":
			return <span style={styles.inlineCode}>{node.content}</span>;
		case "codeBlock":
			return <div style={styles.codeBlock}>{node.content}</div>;
		case "blockQuote": {
			const children = await renderNodes(node.content, ctx);
			return (
				<div style={{ ...styles.paragraph, ...styles.blockquote }}>
					{children}
				</div>
			);
		}
		case "list": {
			const items = await Promise.all(
				node.items.map(async (item, index) => {
					const children = await renderNodes(item, ctx);
					return (
						<div
							key={`li-${index.toString()}`}
							style={{ display: "flex", flexDirection: "row" }}
						>
							<span style={{ marginRight: "8px" }}>•</span>
							<span>{children}</span>
						</div>
					);
				}),
			);
			return <div style={{ ...styles.paragraph, ...styles.list }}>{items}</div>;
		}
		case "link": {
			const children = await renderNodes(node.content, ctx);
			return <span style={styles.link}>{children}</span>;
		}
		case "spoiler": {
			const children = await renderNodes(node.content, ctx);
			return <span style={styles.spoiler}>{children}</span>;
		}
		case "mention":
			return (
				<span style={styles.mention}>
					@{ctx.mentionNames[node.userId] ?? "unknown"}
				</span>
			);
		case "customEmoji": {
			const src = await ctx.loadCustomEmoji(node.id, node.animated);
			return <img src={src} style={styles.customEmoji} alt="emoji" />;
		}
		default:
			return "";
	}
}

export async function renderMarkdown(
	text: string,
	ctx: RenderContext,
): Promise<ReactNode> {
	const normalized = normalizeLineBreaks(text);
	const ast = parser(normalized, { inline: false }) as MarkdownAst;
	const children = await renderNodes(ast, ctx);

	return <div style={styles.root}>{children}</div>;
}

export function normalizeLineBreaks(input: string): string {
	const lines = input.replaceAll(/\r\n?/gu, "\n").split("\n");
	let inFence = false;
	const out: string[] = [];

	for (const line of lines) {
		if (line.startsWith("```")) {
			inFence = !inFence;
			out.push(line);
			continue;
		}

		if (inFence) {
			out.push(line);
			continue;
		}

		if (line === "") {
			out.push(line);
			continue;
		}

		out.push(`${line}\n`);
	}

	return out.join("\n");
}

export type { MentionMap };
