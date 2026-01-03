import type { ReactElement, ReactNode } from "react";
import { isValidElement } from "react";
import { describe, expect, it, vi } from "vitest";

import { normalizeLineBreaks, renderMarkdown } from "./markdown";

type AnyElement = ReactElement<Record<string, unknown>>;

function collectText(node: ReactNode | undefined): string[] {
	if (node == null || typeof node === "boolean") {
		return [];
	}
	if (typeof node === "string" || typeof node === "number") {
		return [String(node)];
	}
	if (Array.isArray(node)) {
		return node.flatMap((child: ReactNode) => collectText(child));
	}
	if (isValidElement(node)) {
		const element = node as AnyElement;
		const props = element.props;
		return collectText(props["children"] as ReactNode | undefined);
	}
	return [];
}

function findElements(
	node: ReactNode | undefined,
	type: string,
): ReactElement[] {
	const results: AnyElement[] = [];

	const visit = (current: ReactNode | undefined): void => {
		if (current == null || typeof current === "boolean") {
			return;
		}
		if (Array.isArray(current)) {
			current.forEach((child: ReactNode) => {
				visit(child);
			});
			return;
		}
		if (isValidElement(current)) {
			const element = current as AnyElement;
			if (element.type === type) {
				results.push(element);
			}
			const props = element.props;
			visit(props["children"] as ReactNode | undefined);
		}
	};

	visit(node);
	return results;
}

describe("renderMarkdown", () => {
	it("renders mentions with display names and falls back to unknown", async () => {
		const tree = await renderMarkdown("Hello <@123> and <@!999>", {
			mentionNames: { "123": "Alice" },
			loadCustomEmoji: vi.fn(),
		});

		const text = collectText(tree).join("");
		expect(text).toBe("Hello @Alice and @unknown");
	});

	it("renders custom emoji images using loader results", async () => {
		const loadCustomEmoji = vi
			.fn()
			.mockResolvedValueOnce("data:image/gif;base64,aaa")
			.mockResolvedValueOnce("data:image/png;base64,bbb");

		const tree = await renderMarkdown("hi <:smile:42> and <a:dance:43>", {
			mentionNames: {},
			loadCustomEmoji,
		});

		const imgs = findElements(tree, "img");
		expect(imgs.length).toBe(2);
		if (imgs.length !== 2) {
			throw new Error("Unexpected image element count");
		}
		const [first, second] = imgs as [AnyElement, AnyElement];
		expect((first.props as { src?: string }).src).toBe(
			"data:image/gif;base64,aaa",
		);
		expect((second.props as { src?: string }).src).toBe(
			"data:image/png;base64,bbb",
		);
		expect(loadCustomEmoji).toHaveBeenCalledWith("42", false);
		expect(loadCustomEmoji).toHaveBeenCalledWith("43", true);
	});

	it("renders spoiler content without masking", async () => {
		const tree = await renderMarkdown("This is ||secret|| text", {
			mentionNames: {},
			loadCustomEmoji: vi.fn(),
		});

		const text = collectText(tree).join("");
		expect(text).toContain("secret");

		const spoiler = findElements(tree, "span").find(
			(el) =>
				(el.props as { style?: Record<string, unknown> }).style?.["border"] !=
				null,
		);
		expect(spoiler).toBeDefined();
	});

	it("renders links as styled spans (not anchors)", async () => {
		const tree = await renderMarkdown("[docs](https://example.com)", {
			mentionNames: {},
			loadCustomEmoji: vi.fn(),
		});

		const spans = findElements(tree, "span");
		const link = spans.find(
			(el) =>
				(el.props as { style?: Record<string, unknown> }).style?.[
					"textDecoration"
				] === "underline",
		);
		expect(link).toBeDefined();
		expect(link?.type).toBe("span");
		expect(collectText(link).join("")).toBe("docs");
	});

	it("preserves code fences while normalizing other line breaks", () => {
		const input = "line1\r\nline2\n\n```\r\ncode\r\nblock\r\n```\nline3";
		const output = normalizeLineBreaks(input);

		expect(output).toBe("line1\n\nline2\n\n\n```\ncode\nblock\n```\nline3\n");
	});

	it("keeps code block content intact", async () => {
		const tree = await renderMarkdown("```\nline1\n\nline2\n```", {
			mentionNames: {},
			loadCustomEmoji: vi.fn(),
		});

		const codeBlocks = findElements(tree, "div").filter(
			(el) =>
				(el.props as { style?: Record<string, unknown> }).style?.[
					"whiteSpace"
				] === "pre-wrap",
		);
		expect(codeBlocks).toHaveLength(1);
		expect(collectText(codeBlocks[0]).join("")).toBe("line1\n\nline2");
	});

	it("segments Japanese text and wraps in span elements", async () => {
		const tree = await renderMarkdown("今日はいい天気ですね。", {
			mentionNames: {},
			loadCustomEmoji: vi.fn(),
		});

		const text = collectText(tree).join("");
		expect(text).toContain("今日はいい天気ですね。");
	});

	it("does not segment text inside code blocks", async () => {
		const tree = await renderMarkdown("```\n今日はいい天気ですね。\n```", {
			mentionNames: {},
			loadCustomEmoji: vi.fn(),
		});

		const codeBlocks = findElements(tree, "div").filter(
			(el) =>
				(el.props as { style?: Record<string, unknown> }).style?.[
					"whiteSpace"
				] === "pre-wrap",
		);
		expect(codeBlocks).toHaveLength(1);
		expect(collectText(codeBlocks[0]).join("")).toBe("今日はいい天気ですね。");
	});
});
