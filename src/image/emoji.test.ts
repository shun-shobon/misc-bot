import { describe, expect, it } from "vitest";

import { twemojiUrl } from "./emoji";

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
