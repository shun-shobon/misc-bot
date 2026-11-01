import { renderToString } from "hono/jsx/dom/server";

import { HEIGHT, Page, READY_SELECTOR, WIDTH } from "./Component";
import type { MentionMap } from "./markdown";
import { renderMarkdown } from "./markdown";

interface Params {
	iconUrl: string;
	text: string;
	name: string;
	id: string;
	mentionNames?: MentionMap;
}

export function renderHtml(params: Params): string {
	const content = renderMarkdown(params.text, { mentionNames: params.mentionNames ?? {} });
	const page = renderToString(
		<Page iconUrl={params.iconUrl} content={content} name={params.name} id={params.id} />,
	);

	return `<!doctype html>${page}`;
}

export async function generateImage(browser: BrowserRun, params: Params): Promise<Uint8Array> {
	const res = await browser.quickAction("screenshot", {
		html: renderHtml(params),
		viewport: { width: WIDTH, height: HEIGHT },
		waitForSelector: { selector: READY_SELECTOR, timeout: 30_000 },
	});
	if (!res.ok) {
		throw new Error(`Failed to take screenshot: ${res.status} ${await res.text()}`);
	}

	return new Uint8Array(await res.arrayBuffer());
}
