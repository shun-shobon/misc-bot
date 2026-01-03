import type { ReactNode } from "react";

interface Props {
	iconSrc: string;
	content: ReactNode;
	name: string;
	id: string;
}

export function Component({ iconSrc, content, name, id }: Props): ReactNode {
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
				}}
			>
				<div style={{ width: "100%", textAlign: "left", display: "flex" }}>
					{content}
				</div>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						marginTop: "24px",
						gap: "4px",
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
							textAlign: "center",
							opacity: 0.65,
						}}
					>
						@{id}
					</span>
				</div>
			</div>
		</div>
	);
}
