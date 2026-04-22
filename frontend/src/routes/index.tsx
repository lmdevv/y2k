import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Skeleton } from "../components/ui/skeleton";
import { VideoCard } from "../components/VideoCard";

export const Route = createFileRoute("/")({ component: HomePage });

function HomePage() {
	const videos = useQuery(api.videos.list);

	return (
		<main className="page-wrap px-4 pb-10 pt-10 sm:pt-12">
			<div className="mb-6 flex items-end justify-between gap-4">
				<div>
					<h1 className="m-0 text-2xl font-bold tracking-tight text-[var(--sea-ink)] sm:text-3xl">
						Videos
					</h1>
					<p className="mt-1 text-sm text-[var(--sea-ink-soft)]">
						Minimal MVP powered by Convex, Clerk, and Mux.
					</p>
				</div>
			</div>

			{videos === undefined ? (
				<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{Array.from({ length: 6 }).map((_, i) => (
						<div
							// biome-ignore lint/suspicious/noArrayIndexKey: stable skeleton list
							key={i}
							className="rounded-2xl border border-[var(--line)] bg-[var(--island-bg)] p-2"
						>
							<Skeleton className="aspect-video w-full rounded-xl" />
							<Skeleton className="mt-3 h-4 w-4/5" />
							<Skeleton className="mt-2 h-4 w-2/5" />
						</div>
					))}
				</section>
			) : videos.length === 0 ? (
				<section className="island-shell rounded-2xl p-6">
					<p className="m-0 text-sm text-[var(--sea-ink-soft)]">
						No videos yet. Run{" "}
						<code>nix develop -c npx convex run videos:seed</code> to seed the
						two Mux videos.
					</p>
				</section>
			) : (
				<section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{videos.map((video) => (
						<VideoCard
							key={video._id}
							id={video._id}
							title={video.title}
							muxPlaybackId={video.muxPlaybackId}
							durationSeconds={video.durationSeconds}
						/>
					))}
				</section>
			)}
		</main>
	);
}
