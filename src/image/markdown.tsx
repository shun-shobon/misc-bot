import type { Capture, Parser, ParserRules, State } from "@khanacademy/simple-markdown";
import SimpleMarkdown from "@khanacademy/simple-markdown";
import type { Child } from "hono/jsx";

import { withTwemoji } from "./emoji";

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
}

const TEXT_ORDER = SimpleMarkdown.defaultRules.text.order;
const EM_ORDER = SimpleMarkdown.defaultRules.em.order;

const rules: ParserRules = {
	...(SimpleMarkdown.defaultRules as Omit<typeof SimpleMarkdown.defaultRules, "Array">),
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

function renderNodes(nodes: MarkdownAst, ctx: RenderContext): Child[] {
	return nodes.map((node) => renderNode(node, ctx));
}

function renderNode(node: MarkdownNode, ctx: RenderContext): Child {
	switch (node.type) {
		case "text":
			return withTwemoji(node.content);
		case "paragraph":
			return <p>{renderNodes(node.content, ctx)}</p>;
		case "heading":
			switch (node.level) {
				case 1:
					return <h1>{renderNodes(node.content, ctx)}</h1>;
				case 2:
					return <h2>{renderNodes(node.content, ctx)}</h2>;
				default:
					return <h3>{renderNodes(node.content, ctx)}</h3>;
			}
		case "strong":
			return <strong>{renderNodes(node.content, ctx)}</strong>;
		case "em":
			return <em>{renderNodes(node.content, ctx)}</em>;
		case "del":
			return <del>{renderNodes(node.content, ctx)}</del>;
		case "inlineCode":
			return <code>{withTwemoji(node.content)}</code>;
		case "codeBlock":
			return (
				<pre>
					<code>{withTwemoji(node.content)}</code>
				</pre>
			);
		case "blockQuote":
			return <blockquote>{renderNodes(node.content, ctx)}</blockquote>;
		case "list":
			return (
				<ul>
					{node.items.map((item) => (
						<li>{renderNodes(item, ctx)}</li>
					))}
				</ul>
			);
		case "link":
			// 画像内のリンクは機能しないため、見た目だけリンクにする
			return <span class="link">{renderNodes(node.content, ctx)}</span>;
		case "spoiler":
			return <span class="spoiler">{renderNodes(node.content, ctx)}</span>;
		case "mention":
			return (
				<span class="mention">@{withTwemoji(ctx.mentionNames[node.userId] ?? "unknown")}</span>
			);
		case "customEmoji":
			return <img class="emoji" src={customEmojiUrl(node.id, node.animated)} alt="" />;
		default:
			return "";
	}
}

function customEmojiUrl(id: string, animated: boolean): string {
	return `https://cdn.discordapp.com/emojis/${id}.${animated ? "gif" : "png"}`;
}

export function renderMarkdown(text: string, ctx: RenderContext): Child {
	const normalized = normalizeLineBreaks(text);
	// oxlint-disable-next-line typescript/no-unsafe-type-assertion -- simple-markdown の型はカスタムルールが返すノードの形を表現できない
	const ast = parser(normalized, { inline: false }) as MarkdownAst;

	return renderNodes(ast, ctx);
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
