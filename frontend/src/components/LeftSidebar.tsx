import { Link } from "@tanstack/react-router";
import {
	Clock,
	Film,
	Flame,
	History,
	Home,
	Music,
	Radio,
	ThumbsUp,
	Trophy,
	Tv,
	Video,
} from "lucide-react";
import type { ComponentType } from "react";

interface SideLink {
	label: string;
	icon: ComponentType<{ size?: number; className?: string }>;
	active?: boolean;
}

const topItems: SideLink[] = [
	{ label: "Home", icon: Home, active: true },
	{ label: "Popular on YouTube", icon: Flame },
	{ label: "Music", icon: Music },
	{ label: "Sports", icon: Trophy },
	{ label: "Gaming", icon: Tv },
	{ label: "Movies", icon: Film },
	{ label: "News", icon: Radio },
	{ label: "Live", icon: Video },
];

const userItems: SideLink[] = [
	{ label: "History", icon: History },
	{ label: "Watch Later", icon: Clock },
	{ label: "Liked videos", icon: ThumbsUp },
];

export default function LeftSidebar() {
	return (
		<aside className="w-[165px] flex-shrink-0 text-[12px]">
			{/* Sign-in prompt box */}
			<div className="yt-box mb-3 px-3 py-3 text-[11px] leading-[1.5] text-[var(--yt-text-soft)]">
				<p className="m-0">Sign in to add channels to your homepage</p>
				<div className="mt-2 flex items-center gap-2">
					<Link to="/" className="yt-btn yt-btn-blue">
						Sign in
					</Link>
				</div>
			</div>

			{/* Primary nav list */}
			<nav className="yt-box mb-3 overflow-hidden py-1">
				{topItems.map((item) => {
					const Icon = item.icon;
					return (
						<Link
							key={item.label}
							to="/"
							className={`yt-side-item ${item.active ? "is-active" : ""}`}
						>
							<Icon size={14} className="text-[var(--yt-text-soft)]" />
							<span>{item.label}</span>
						</Link>
					);
				})}
			</nav>

			<div className="yt-box mb-3 overflow-hidden py-1">
				<div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--yt-text-muted)]">
					Library
				</div>
				{userItems.map((item) => {
					const Icon = item.icon;
					return (
						<a key={item.label} href="#lib" className="yt-side-item">
							<Icon size={14} className="text-[var(--yt-text-soft)]" />
							<span>{item.label}</span>
						</a>
					);
				})}
			</div>

			<div className="yt-box overflow-hidden py-1">
				<div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-[var(--yt-text-muted)]">
					Subscriptions
				</div>
				{[
					"CeeLoMusic",
					"MoviesSpcCOMINGSOON",
					"clevvermovies",
					"TheGamekid1993",
					"TabooMovies",
					"PrometheusTRUEHD",
				].map((channel) => (
					<a
						key={channel}
						href="#channel"
						className="yt-side-item truncate text-[11px]"
					>
						<span className="size-2 rounded-full bg-[var(--yt-red)]" />
						<span className="truncate">{channel}</span>
					</a>
				))}
			</div>
		</aside>
	);
}
