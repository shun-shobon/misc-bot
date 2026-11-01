import { describe, expect, it } from "vitest";

import { isJumboEmoji, twemojiUrl } from "./emoji";

describe("twemojiUrl", () => {
	it("drops VS16 from a single emoji", () => {
		expect(twemojiUrl("❤️")).toMatch(/\/2764\.svg$/u);
	});

	it("keeps VS16 in a ZWJ sequence", () => {
		expect(twemojiUrl("❤️‍🔥")).toMatch(/\/2764-fe0f-200d-1f525\.svg$/u);
	});

	it("joins code points of a flag", () => {
		expect(twemojiUrl("🇯🇵")).toMatch(/\/1f1ef-1f1f5\.svg$/u);
	});
});

describe("isJumboEmoji", () => {
	it("is true for unicode and custom emoji separated by whitespace", () => {
		expect(isJumboEmoji("🎉 <:smile:42>\n<a:dance:43>❤️‍🔥")).toBe(true);
	});

	it("is false when text is mixed in", () => {
		expect(isJumboEmoji("やったね🎉")).toBe(false);
	});

	it("is false for whitespace only", () => {
		expect(isJumboEmoji("  ")).toBe(false);
	});

	it("does not treat plain digits as emoji", () => {
		expect(isJumboEmoji("123")).toBe(false);
	});

	it("is true up to 27 emoji and false beyond", () => {
		expect(isJumboEmoji("🎉".repeat(27))).toBe(true);
		expect(isJumboEmoji("🎉".repeat(28))).toBe(false);
	});
});
