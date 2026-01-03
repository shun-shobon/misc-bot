import { isValidElement } from "react";
import { describe, expect, it } from "vitest";

import { segmentText } from "./budoux";

describe("segmentText", () => {
	it("returns an array of span elements for Japanese text", () => {
		const result = segmentText("今日はいい天気ですね。");

		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);

		for (const element of result) {
			expect(isValidElement(element)).toBe(true);
		}
	});

	it("returns an empty array for empty string", () => {
		const result = segmentText("");

		expect(result).toEqual([]);
	});

	it("handles English-only text", () => {
		const result = segmentText("Hello World");

		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);
	});

	it("handles mixed Japanese and English text", () => {
		const result = segmentText("Hello, 今日はいい天気ですね。");

		expect(Array.isArray(result)).toBe(true);
		expect(result.length).toBeGreaterThan(0);
	});

	it("preserves original text when segments are joined", () => {
		const original = "今日はいい天気ですね。";
		const result = segmentText(original);

		const reconstructed = result
			.map((el) => {
				if (isValidElement(el)) {
					return (el.props as { children: string }).children;
				}
				return "";
			})
			.join("");

		expect(reconstructed).toBe(original);
	});
});
