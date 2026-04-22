import MuxPlayer from "@mux/mux-player-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import {
	Flag,
	MessageSquare,
	Plus,
	Share2,
	ThumbsDown,
	ThumbsUp,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Skeleton } from "../../components/ui/skeleton";
import { SuggestedVideoItem } from "../../components/VideoCard";

export const Route = createFileRoute("/watch/$videoId")({
	component: WatchPage,
});

const MOCK_COMMENTS = [
	{
		author: "MrDupreloion",
		when: "38 minutes ago",
		body: "Sacha Baron Cohen is such a boss.",
	},
	{
		author: "kshendd",
		when: "3 hours ago",
		body: "FUCK THIS MOVIE!",
	},
	{
		author: "sq261",
		when: "5 hours ago",
		body: "I would vote Obama in again and again. Republicans would take the US back, and they would still support Israel.",
	},
	{
		author: "MattGovard",
		when: "5 hours ago",
		body: "1:28 xD This will be interesting",
	},
	{
		author: "nefunsta45",
		when: "6 hours ago",
		body: "The Race scene looks funny.....dunno bout the rest",
	},
	{
		author: "XxDiddyDidNoX",
		when: "7 hours ago",
		body: "kinda disappointing I was hoping he would do another movie akin to Borat... not exactly Borat but a movie where hes basically fucking with people in real life situations",
	},
	{
		author: "joaquin8651",
		when: "11 hours ago",
		body: "@XxDiddyDidNoX what about Megan's fur scene? :)",
	},
];

function WatchPage() {
	const { videoId } = Route.useParams();
	const video = useQuery(api.videos.getById, { id: videoId as Id<"videos"> });
	const allVideos = useQuery(api.videos.list);

	return (
		<main className="yt-page-wide grid grid-cols-1 gap-4 px-2 py-4 sm:px-4 lg:grid-cols-[minmax(0,1fr)_320px]">
			<div className="min-w-0">
				{video === undefined ? (
					<div className="flex flex-col gap-3">
						<Skeleton className="aspect-video w-full" />
						<Skeleton className="h-6 w-3/4" />
						<Skeleton className="h-4 w-2/4" />
					</div>
				) : video === null ? (
					<div className="yt-box p-6">
						<h1 className="m-0 text-[16px] font-bold">Video not found</h1>
						<p className="mt-2 text-[12px] text-[var(--yt-text-soft)]">
							This video might have been deleted, or the link is incorrect.
						</p>
						<div className="mt-4">
							<Link to="/" className="yt-btn">
								Go home
							</Link>
						</div>
					</div>
				) : (
					<>
						{/* Title + subscribe */}
						<h1 className="m-0 mb-2 text-[18px] font-bold leading-tight text-[var(--yt-text)]">
							{video.title}
						</h1>

						<div className="mb-3 flex items-center gap-3">
							<button type="button" className="yt-btn yt-btn-red yt-btn-lg">
								SUBSCRIBE
							</button>
							<a href="#channel" className="text-[12px] font-bold">
								MoviesSpcCOMINGSOON
							</a>
							<span className="text-[11px] text-[var(--yt-text-muted)]">
								112 videos
							</span>
							<span className="yt-triangle-down text-[var(--yt-text-muted)]" />
						</div>

						{/* Player */}
						<div className="overflow-hidden border border-black bg-black">
							<MuxPlayer
								playbackId={video.muxPlaybackId}
								streamType="on-demand"
								metadata={{ video_title: video.title }}
								style={{ width: "100%", aspectRatio: "16 / 9" }}
							/>
						</div>

						{/* Action bar */}
						<div className="flex items-end justify-between border-b border-[var(--yt-border-soft)] pb-3 pt-3">
							<div className="flex items-center gap-1 text-[11px]">
								<button type="button" className="yt-btn" aria-label="Like">
									<ThumbsUp size={12} /> Like
								</button>
								<button type="button" className="yt-btn" aria-label="Dislike">
									<ThumbsDown size={12} />
								</button>
								<button type="button" className="yt-btn">
									<Plus size={12} /> Add to
								</button>
								<button type="button" className="yt-btn">
									<Share2 size={12} /> Share
								</button>
								<button type="button" className="yt-btn">
									<Flag size={12} />
								</button>
							</div>

							<div className="text-right">
								<div className="text-[22px] font-bold text-[var(--yt-text)]">
									1,526,664
								</div>
								<div className="text-[10px] text-[var(--yt-text-muted)]">
									4,092 likes, 465 dislikes
								</div>
							</div>
						</div>

						{/* Description */}
						<div className="border-b border-[var(--yt-border-soft)] py-3">
							<div className="flex items-center justify-between">
								<p className="m-0 text-[11px] text-[var(--yt-text-soft)]">
									Uploaded by{" "}
									<a href="#channel" className="font-bold">
										MoviesSpcCOMINGSOON
									</a>{" "}
									on Dec 14, 2011
								</p>
								<p className="m-0 text-[11px] text-[var(--yt-text-soft)]">
									As Seen On:{" "}
									<a href="#partner" className="font-bold">
										FlixHourly
									</a>
								</p>
							</div>
							<p className="mt-2 whitespace-pre-line text-[12px] leading-[1.6] text-[var(--yt-text)]">
								{video.description ??
									`The heroic story of a dictator who risks his life to ensure that democracy\nwould never come to the country he so lovingly oppressed.`}
							</p>
							<button
								type="button"
								className="mt-2 text-[11px] font-bold text-[var(--yt-link)] hover:underline"
							>
								Show more
							</button>
						</div>

						{/* Top comments */}
						<div className="border-b border-[var(--yt-border-soft)] py-3">
							<h2 className="m-0 mb-2 text-[12px] font-bold text-[var(--yt-text)]">
								Top Comments
							</h2>

							<div className="flex flex-col gap-2">
								{MOCK_COMMENTS.slice(0, 2).map((c) => (
									<div key={c.author} className="flex gap-2">
										<div className="yt-comment-avatar" />
										<div className="min-w-0 flex-1">
											<p className="m-0 text-[12px] text-[var(--yt-text)]">
												{c.body}
											</p>
											<p className="m-0 mt-1 text-[11px] text-[var(--yt-text-muted)]">
												<a href="#u" className="font-bold">
													{c.author}
												</a>{" "}
												{c.when}
											</p>
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Video responses */}
						<div className="border-b border-[var(--yt-border-soft)] py-3">
							<div className="flex items-center justify-between">
								<h2 className="m-0 text-[12px] font-bold text-[var(--yt-text)]">
									Video Responses
								</h2>
								<a href="#all" className="text-[11px] font-bold">
									see all
								</a>
							</div>
							<div className="mt-3 flex gap-2">
								<div className="relative h-[54px] w-[96px] flex-shrink-0 overflow-hidden border border-[var(--yt-border-soft)] bg-black">
									<img
										src={`https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg?time=3&width=240`}
										alt=""
										className="h-full w-full object-cover"
									/>
								</div>
								<div className="min-w-0 flex-1">
									<a
										href="#response"
										className="line-clamp-2 text-[12px] font-bold"
									>
										The Dictator Trailer PopUp - Sacha Baron Cohen
									</a>
									<p className="m-0 mt-1 text-[11px] text-[var(--yt-text-muted)]">
										by{" "}
										<a href="#u" className="font-bold">
											snapahotel
										</a>
									</p>
									<p className="m-0 text-[11px] text-[var(--yt-text-muted)]">
										24,109 views
									</p>
								</div>
							</div>
						</div>

						{/* All comments */}
						<div className="py-3">
							<div className="mb-2 flex items-center justify-between">
								<h2 className="m-0 text-[12px] font-bold text-[var(--yt-text)]">
									All Comments ({MOCK_COMMENTS.length})
								</h2>
								<a href="#all-comments" className="text-[11px] font-bold">
									see all
								</a>
							</div>

							<div className="mb-3 flex items-center gap-2 rounded-[2px] border border-[var(--yt-border-soft)] bg-[#fafafa] p-2 text-[11px]">
								<MessageSquare
									size={14}
									className="text-[var(--yt-text-soft)]"
								/>
								<p className="m-0">
									<a href="#signin" className="font-bold">
										Sign In
									</a>{" "}
									or{" "}
									<a href="#signup" className="font-bold">
										Sign Up
									</a>{" "}
									now to post a comment!
								</p>
							</div>

							<div className="flex flex-col gap-3">
								{MOCK_COMMENTS.map((c) => (
									<div key={c.author + c.when} className="flex gap-2">
										<div className="yt-comment-avatar" />
										<div className="min-w-0 flex-1">
											<p className="m-0 text-[12px] leading-[1.5] text-[var(--yt-text)]">
												{c.body}
											</p>
											<p className="m-0 mt-1 text-[11px] text-[var(--yt-text-muted)]">
												<a href="#u" className="font-bold">
													{c.author}
												</a>{" "}
												{c.when}
											</p>
										</div>
									</div>
								))}
							</div>

							<div className="yt-pager mt-4 text-center">
								<span className="is-current">1</span>
								<a href="#c2">2</a>
								<a href="#c3">3</a>
								<a href="#c4">4</a>
								<a href="#c5">5</a>
								<a href="#cn">Next &gt;</a>
							</div>
						</div>
					</>
				)}
			</div>

			{/* Right rail: suggested videos */}
			<aside className="min-w-0">
				<div className="yt-box">
					<div className="yt-section-title">Suggestions</div>
					{allVideos === undefined ? (
						<div className="flex flex-col gap-2 p-2">
							{Array.from({ length: 8 }).map((_, i) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: stable skeleton list
									key={i}
									className="flex gap-2"
								>
									<Skeleton className="h-[54px] w-[96px]" />
									<div className="min-w-0 flex-1">
										<Skeleton className="h-3 w-4/5" />
										<Skeleton className="mt-2 h-3 w-2/5" />
									</div>
								</div>
							))}
						</div>
					) : (
						<div>
							{allVideos
								.filter((v) => v._id !== videoId)
								.map((v) => (
									<SuggestedVideoItem
										key={v._id}
										id={v._id}
										title={v.title}
										muxPlaybackId={v.muxPlaybackId}
										durationSeconds={v.durationSeconds}
									/>
								))}
							{/* If there's only one video seeded, pad with dupes so the rail
							    matches the screenshot density */}
							{allVideos.length > 0 &&
								Array.from({ length: Math.max(0, 10 - allVideos.length) }).map(
									(_, i) => {
										const v = allVideos[i % allVideos.length];
										return (
											<SuggestedVideoItem
												// biome-ignore lint/suspicious/noArrayIndexKey: padded duplicates
												key={`pad-${i}`}
												id={v._id}
												title={v.title}
												muxPlaybackId={v.muxPlaybackId}
												durationSeconds={v.durationSeconds}
											/>
										);
									},
								)}
						</div>
					)}
					<div className="border-t border-[var(--yt-border-soft)] bg-[#fafafa] p-2 text-center">
						<button type="button" className="yt-btn">
							Load more suggestions
						</button>
					</div>
				</div>
			</aside>
		</main>
	);
}
