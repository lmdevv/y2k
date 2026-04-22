import { Link } from "@tanstack/react-router";
import type { Id } from "../../convex/_generated/dataModel";

function formatDuration(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = Math.floor(totalSeconds % 60);
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function VideoCard(props: {
	id: Id<"videos">;
	title: string;
	muxPlaybackId: string;
	durationSeconds?: number;
}) {
	const thumbnailUrl = `https://image.mux.com/${props.muxPlaybackId}/thumbnail.jpg?time=1`;

	return (
		<Link
			to="/watch/$videoId"
			params={{ videoId: props.id }}
			className="group block rounded-2xl border border-[var(--line)] bg-[var(--island-bg)] p-2 no-underline shadow-[0_10px_30px_rgba(24,65,52,0.08)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_44px_rgba(24,65,52,0.14)] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
		>
			<div className="relative overflow-hidden rounded-xl border border-[var(--line)] bg-muted">
				<img
					src={thumbnailUrl}
					alt={props.title}
					loading="lazy"
					className="aspect-video w-full object-cover transition group-hover:scale-[1.02]"
				/>
				{typeof props.durationSeconds === "number" ? (
					<div className="absolute bottom-2 right-2 rounded-md bg-background/90 px-2 py-1 text-xs font-medium text-foreground shadow-sm">
						{formatDuration(props.durationSeconds)}
					</div>
				) : null}
			</div>

			<div className="px-1.5 pb-1 pt-2">
				<div className="line-clamp-2 text-sm font-semibold text-[var(--sea-ink)]">
					{props.title}
				</div>
			</div>
		</Link>
	);
}
