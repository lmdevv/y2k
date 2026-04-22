import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import LeftSidebar from "../components/LeftSidebar";
import { Skeleton } from "../components/ui/skeleton";
import { VideoRow } from "../components/VideoCard";

export const Route = createFileRoute("/")({ component: HomePage });

/** Deterministic pseudo-random helpers so SSR/hydration match. */
function pseudoRandom(seed: string) {
	let h = 0;
	for (let i = 0; i < seed.length; i++) {
		h = (h * 31 + seed.charCodeAt(i)) | 0;
	}
	return Math.abs(h);
}

const UPLOADERS = [
	"MoviesSpcCOMINGSOON",
	"clevvermovies",
	"movietrailers",
	"TheGamekid1993",
	"CeeLoMusic",
	"TabooMovies",
	"filmtrailerzone",
	"PrometheusTRUEHD",
];

const AGO = [
	"3 hours ago",
	"6 hours ago",
	"18 hours ago",
	"1 day ago",
	"2 days ago",
	"4 days ago",
	"1 week ago",
];

function enrich(id: string, index: number) {
	const rng = pseudoRandom(id);
	return {
		uploader: UPLOADERS[(rng + index) % UPLOADERS.length],
		views: 10_000 + (rng % 4_900_000),
		uploaded: AGO[(rng + index) % AGO.length],
	};
}

function HomePage() {
	const videos = useQuery(api.videos.list);

	return (
		<main className="yt-page-wide flex gap-4 px-2 py-4 sm:px-4">
			<LeftSidebar />

			<div className="min-w-0 flex-1">
				{/* Featured promo banner (gift card style ad like the screenshot) */}
				<div
					className="mb-4 flex h-[80px] items-center gap-4 overflow-hidden rounded-[2px] border border-[var(--yt-border)] px-6 text-white"
					style={{
						background:
							"linear-gradient(90deg, #c94141 0%, #8b2525 40%, #6b1818 100%)",
					}}
				>
					<div className="text-[22px] font-bold italic leading-tight">
						THE BAR SOAP YOU'VE
						<br />
						BEEN SMELLING FOR.
					</div>
					<div className="ml-auto flex items-center gap-3">
						<div
							className="h-[50px] w-[150px] border border-white/50"
							style={{
								background: "linear-gradient(135deg, #e8c8b8 0%, #d4a88a 100%)",
							}}
						/>
					</div>
				</div>

				<div className="yt-box">
					<div className="flex items-center border-b border-[var(--yt-border-soft)] bg-[#fafafa]">
						<div className="border-b-2 border-[var(--yt-red)] px-4 py-2 text-[12px] font-bold text-[var(--yt-text)]">
							What to Watch
						</div>
						<a
							href="#featured"
							className="px-4 py-2 text-[12px] font-bold text-[var(--yt-text-soft)]"
						>
							My Subscriptions
						</a>
						<a
							href="#recommended"
							className="px-4 py-2 text-[12px] font-bold text-[var(--yt-text-soft)]"
						>
							Recommended
						</a>
						<div className="ml-auto px-4 text-[11px] text-[var(--yt-text-muted)]">
							Videos
						</div>
					</div>

					{videos === undefined ? (
						<div>
							{Array.from({ length: 8 }).map((_, i) => (
								<div
									// biome-ignore lint/suspicious/noArrayIndexKey: stable skeleton list
									key={i}
									className="yt-video-row"
								>
									<Skeleton className="h-[68px] w-[120px]" />
									<div className="min-w-0">
										<Skeleton className="h-[13px] w-4/5" />
										<Skeleton className="mt-2 h-[11px] w-2/5" />
										<Skeleton className="mt-1 h-[11px] w-1/4" />
									</div>
									<Skeleton className="h-[11px] w-14" />
								</div>
							))}
						</div>
					) : videos.length === 0 ? (
						<div className="p-6 text-[12px] text-[var(--yt-text-soft)]">
							<p>
								No videos yet. Run{" "}
								<code>nix develop -c npx convex run videos:seed</code> to seed
								the two Mux videos.
							</p>
						</div>
					) : (
						<div>
							{videos.map((video, index) => {
								const extra = enrich(String(video._id), index);
								return (
									<VideoRow
										key={video._id}
										id={video._id}
										title={video.title}
										muxPlaybackId={video.muxPlaybackId}
										durationSeconds={video.durationSeconds}
										uploader={extra.uploader}
										views={extra.views}
										uploaded={extra.uploaded}
									/>
								);
							})}
						</div>
					)}
				</div>

				{/* Classic pager */}
				<div className="yt-pager mt-4 text-center">
					<span className="is-current">1</span>
					<a href="#p2">2</a>
					<a href="#p3">3</a>
					<a href="#p4">4</a>
					<a href="#p5">5</a>
					<a href="#next">Next &gt;</a>
				</div>
			</div>
		</main>
	);
}
