import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils";
import type { Id } from "../../convex/_generated/dataModel";

function formatDuration(totalSeconds: number) {
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = Math.floor(totalSeconds % 60);
	return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

function formatViews(n: number): string {
	if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
	if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
	return String(n);
}

export interface VideoCardData {
	id: Id<"videos">;
	title: string;
	muxPlaybackId: string;
	durationSeconds?: number;
	uploader?: string;
	views?: number;
	uploaded?: string;
}

/**
 * Old-YouTube style list row: 120×67 thumbnail, title (link), uploader, views.
 * Used on the home feed and in suggested videos.
 */
export function VideoRow(props: VideoCardData & { className?: string }) {
	const thumbnailUrl = `https://image.mux.com/${props.muxPlaybackId}/thumbnail.jpg?time=1&width=240`;

	return (
		<div className={cn("yt-video-row", props.className)}>
			<Link
				to="/watch/$videoId"
				params={{ videoId: props.id }}
				className="relative block h-[68px] w-[120px] overflow-hidden border border-[var(--yt-border-soft)] bg-black"
			>
				<img
					src={thumbnailUrl}
					alt=""
					loading="lazy"
					className="h-full w-full object-cover"
				/>
				{typeof props.durationSeconds === "number" ? (
					<span className="absolute bottom-[3px] right-[3px] bg-black/80 px-1 text-[10px] font-bold text-white">
						{formatDuration(props.durationSeconds)}
					</span>
				) : null}
			</Link>

			<div className="min-w-0">
				<Link
					to="/watch/$videoId"
					params={{ videoId: props.id }}
					className="line-clamp-2 text-[13px] font-bold leading-[1.35]"
				>
					{props.title}
				</Link>
				<div className="mt-1 text-[11px] text-[var(--yt-text-soft)]">
					by{" "}
					<a href="#channel" className="font-bold">
						{props.uploader ?? "MoviesSpcCOMINGSOON"}
					</a>
				</div>
				{typeof props.views === "number" ? (
					<div className="text-[11px] text-[var(--yt-text-muted)]">
						{formatViews(props.views)} views
					</div>
				) : null}
			</div>

			<div className="flex-shrink-0 text-right text-[11px] text-[var(--yt-text-muted)]">
				{props.uploaded ?? ""}
			</div>
		</div>
	);
}

/**
 * Compact list item (narrower) for the right-rail suggested videos column on
 * the watch page.
 */
export function SuggestedVideoItem(props: VideoCardData) {
	const thumbnailUrl = `https://image.mux.com/${props.muxPlaybackId}/thumbnail.jpg?time=1&width=240`;

	return (
		<div className="flex gap-2 border-b border-[var(--yt-border-soft)] px-2 py-2 last:border-b-0 hover:bg-[#fafafa]">
			<Link
				to="/watch/$videoId"
				params={{ videoId: props.id }}
				className="relative block h-[54px] w-[96px] flex-shrink-0 overflow-hidden border border-[var(--yt-border-soft)] bg-black"
			>
				<img
					src={thumbnailUrl}
					alt=""
					loading="lazy"
					className="h-full w-full object-cover"
				/>
				{typeof props.durationSeconds === "number" ? (
					<span className="absolute bottom-[2px] right-[2px] bg-black/80 px-1 text-[10px] font-bold text-white">
						{formatDuration(props.durationSeconds)}
					</span>
				) : null}
			</Link>
			<div className="min-w-0 flex-1">
				<Link
					to="/watch/$videoId"
					params={{ videoId: props.id }}
					className="line-clamp-2 text-[12px] font-bold leading-[1.3]"
				>
					{props.title}
				</Link>
				<div className="mt-1 truncate text-[11px] text-[var(--yt-text-soft)]">
					by{" "}
					<a href="#channel" className="font-bold">
						{props.uploader ?? "MoviesSpcCOMINGSOON"}
					</a>
				</div>
				<div className="truncate text-[11px] text-[var(--yt-text-muted)]">
					{formatViews(props.views ?? Math.floor(Math.random() * 5_000_000))}{" "}
					views
				</div>
			</div>
		</div>
	);
}
