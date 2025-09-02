import type { ReactNode } from "react";

interface Props {
	iconSrc: string;
	text: string;
	name: string;
	id: string;
}

export function Component({ iconSrc, text, name, id }: Props): ReactNode {
	return (
		<div
			lang="ja-JP"
			style={{
				width: "100%",
				height: "100%",
				display: "flex",
				alignItems: "center",
				backgroundColor: "#000000",
				color: "#fafafa",
				fontFamily: "'Noto Sans JP'",
				fontSize: "32px",
			}}
		>
			<img
				src={iconSrc}
				alt=""
				style={{
					width: "40%",
					height: "100%",
					objectFit: "cover",
					filter: "grayscale(100%)",
					maskImage: "linear-gradient(to right, white 70%, transparent 100%)",
				}}
			/>
			<div
				style={{
					width: "60%",
					padding: "32px",
					display: "flex",
					flexDirection: "column",
					alignItems: "center",
					flexGrow: 1,
					gap: "24px",
				}}
			>
				<span
					style={{
						textAlign: "center",
					}}
				>
					{text}
				</span>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
					}}
				>
					<span
						style={{
							fontSize: "24px",
							textAlign: "center",
						}}
					>
						{name}
					</span>
					<span
						style={{
							fontSize: "20px",
							color: "#878787",
							textAlign: "center",
						}}
					>
						@{id}
					</span>
				</div>
			</div>
		</div>
	);
}
