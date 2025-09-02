export async function fetchFont(
	text: string,
	name: string,
	weight: number,
): Promise<ArrayBuffer> {
	const url = new URL("https://fonts.googleapis.com/css2");
	url.searchParams.append("family", `${name}:wght@${weight}`);
	url.searchParams.append("text", text);

	const cssRes = await fetch(url, {
		headers: {
			// ref: https://github.com/vercel/satori/blob/83d658542719c5cf0ea2354e782489f9e1e60a84/playground/pages/api/font.ts#L23C4-L25
			"User-Agent":
				"Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1",
		},
	});
	if (!cssRes.ok) {
		throw new Error("Failed to fetch font");
	}

	const css = await cssRes.text();

	const resource =
		/src: url\((?<fontUrl>.+)\) format\('(?:opentype|truetype)'\)/u.exec(css);

	const fontUrl = resource?.groups?.["fontUrl"];

	if (fontUrl == null) {
		throw new Error("Failed to parse font");
	}

	const fontRes = await fetch(fontUrl);
	if (!fontRes.ok) {
		throw new Error(`Failed to fetch font: ${fontRes.statusText}`);
	}

	return await fontRes.arrayBuffer();
}
