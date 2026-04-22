import MuxPlayer from "@mux/mux-player-react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { Button } from "../../components/ui/button";
import { Skeleton } from "../../components/ui/skeleton";

export const Route = createFileRoute("/watch/$videoId")({
	component: WatchPage,
});

function WatchPage() {
	const { videoId } = Route.useParams();
	const video = useQuery(api.videos.getById, { id: videoId as Id<"videos"> });

	return (
		<main className="page-wrap px-4 pb-10 pt-10 sm:pt-12">
			<div className="mb-6">
				<Link
					to="/"
					className="inline-flex items-center text-sm font-semibold text-[var(--sea-ink-soft)] no-underline hover:text-[var(--sea-ink)]"
				>
					← Back
				</Link>
			</div>

			{video === undefined ? (
				<section className="flex flex-col gap-4">
					<Skeleton className="aspect-video w-full rounded-2xl" />
					<div className="flex flex-col gap-2">
						<Skeleton className="h-6 w-3/4" />
						<Skeleton className="h-4 w-2/4" />
					</div>
				</section>
			) : video === null ? (
				<section className="island-shell rounded-2xl p-6">
					<h1 className="m-0 text-lg font-semibold text-[var(--sea-ink)]">
						Video not found
					</h1>
					<p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
						This video might have been deleted, or the link is incorrect.
					</p>
					<div className="mt-4">
						<Button asChild variant="secondary">
							<Link to="/">Go home</Link>
						</Button>
					</div>
				</section>
			) : (
				<section className="flex flex-col gap-4">
					<div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-black">
						<MuxPlayer
							playbackId={video.muxPlaybackId}
							streamType="on-demand"
							metadata={{ video_title: video.title }}
							style={{ width: "100%", aspectRatio: "16 / 9" }}
						/>
					</div>

					<div>
						<h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--sea-ink)]">
							{video.title}
						</h1>
						{video.description ? (
							<p className="mt-2 text-sm text-[var(--sea-ink-soft)]">
								{video.description}
							</p>
						) : null}
					</div>
				</section>
			)}
		</main>
	);
}
