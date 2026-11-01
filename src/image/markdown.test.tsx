import { renderToString } from "hono/jsx/dom/server";
import { describe, expect, it } from "vitest";

import { normalizeLineBreaks, renderMarkdown } from "./markdown";

function render(text: string, mentionNames: Record<string, string> = {}): string {
	return renderToString(<>{renderMarkdown(text, { mentionNames })}</>);
}

describe("renderMarkdown", () => {
	it("renders mentions with display names and falls back to unknown", () => {
		const html = render("Hello <@123> and <@!999>", { "123": "Alice" });

		expect(html).toContain('<span class="mention">@Alice</span>');
		expect(html).toContain('<span class="mention">@unknown</span>');
	});

	it("renders custom emoji as Discord CDN images", () => {
		const html = render("hi <:smile:42> and <a:dance:43>");

		expect(html).toContain('src="https://cdn.discordapp.com/emojis/42.png"');
		expect(html).toContain('src="https://cdn.discordapp.com/emojis/43.gif"');
	});

	it("renders spoiler content without masking", () => {
		const html = render("This is ||secret|| text");

		expect(html).toContain('<span class="spoiler">secret</span>');
	});

	it("renders links as styled spans (not anchors)", () => {
		const html = render("[docs](https://example.com)");

		expect(html).toContain('<span class="link">docs</span>');
		expect(html).not.toContain("<a");
	});

	it("replaces unicode emoji with Twemoji images", () => {
		const html = render("やったね🎉");

		expect(html).toContain("やったね<img");
		expect(html).toContain("/1f389.svg");
	});

	it("preserves code fences while normalizing other line breaks", () => {
		const input = "line1\r\nline2\n\n```\r\ncode\r\nblock\r\n```\nline3";
		const output = normalizeLineBreaks(input);

		expect(output).toBe("line1\n\nline2\n\n\n```\ncode\nblock\n```\nline3\n");
	});

	it("keeps code block content intact", () => {
		const html = render("```\nline1\n\nline2\n```");

		expect(html).toContain("<pre><code>line1\n\nline2</code></pre>");
	});

	it("escapes HTML in text", () => {
		const html = render("<script>alert(1)</script>");

		expect(html).not.toContain("<script>");
	});
});
