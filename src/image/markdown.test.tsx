import { describe, expect, it } from "vitest";

import { normalizeLineBreaks, renderMarkdown } from "./markdown";

async function render(text: string, mentionNames: Record<string, string> = {}): Promise<string> {
	return await (<>{renderMarkdown(text, { mentionNames })}</>).toString();
}

describe("renderMarkdown", () => {
	it("renders mentions with display names and falls back to unknown", async () => {
		const html = await render("Hello <@123> and <@!999>", { "123": "Alice" });

		expect(html).toContain('<span class="mention">@Alice</span>');
		expect(html).toContain('<span class="mention">@unknown</span>');
	});

	it("renders custom emoji as Discord CDN images", async () => {
		const html = await render("hi <:smile:42> and <a:dance:43>");

		expect(html).toContain('src="https://cdn.discordapp.com/emojis/42.png"');
		expect(html).toContain('src="https://cdn.discordapp.com/emojis/43.gif"');
	});

	it("renders spoiler content without masking", async () => {
		const html = await render("This is ||secret|| text");

		expect(html).toContain('<span class="spoiler">secret</span>');
	});

	it("renders links as styled spans (not anchors)", async () => {
		const html = await render("[docs](https://example.com)");

		expect(html).toContain('<span class="link">docs</span>');
		expect(html).not.toContain("<a");
	});

	it("replaces unicode emoji with Twemoji images", async () => {
		const html = await render("やったね🎉");

		expect(html).toContain("やったね<img");
		expect(html).toContain("/1f389.svg");
	});

	it("preserves code fences while normalizing other line breaks", () => {
		const input = "line1\r\nline2\n\n```\r\ncode\r\nblock\r\n```\nline3";
		const output = normalizeLineBreaks(input);

		expect(output).toBe("line1\n\nline2\n\n\n```\ncode\nblock\n```\nline3\n");
	});

	it("keeps code block content intact", async () => {
		const html = await render("```\nline1\n\nline2\n```");

		expect(html).toContain("<pre><code>line1\n\nline2</code></pre>");
	});

	it("escapes HTML in text", async () => {
		const html = await render("<script>alert(1)</script>");

		expect(html).not.toContain("<script>");
	});
});
