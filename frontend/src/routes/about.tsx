import { createFileRoute, Link } from "@tanstack/react-router";
import { Briefcase, Compass, Mail, Shirt, Users, Wrench } from "lucide-react";
import type { ComponentType } from "react";

export const Route = createFileRoute("/about")({
	component: About,
});

interface Tile {
	id: string;
	title: string;
	icon: ComponentType<{ size?: number; className?: string }>;
	body: string;
}

const TILES: Tile[] = [
	{
		id: "getting-started",
		title: "Getting Started",
		icon: Compass,
		body: "We've put together a step-by-step guide to get you started on YouTube.",
	},
	{
		id: "essentials",
		title: "YouTube Essentials",
		icon: Wrench,
		body: "A list of the essential YouTube tools and features that help you view, discover, share, personalize, and upload videos.",
	},
	{
		id: "community",
		title: "Community Guidelines",
		icon: Users,
		body: "Read up on our guidelines for participating in the YouTube community.",
	},
	{
		id: "contact",
		title: "Contact Us",
		icon: Mail,
		body: "Find contact information for our various departments.",
	},
	{
		id: "careers",
		title: "Careers",
		icon: Briefcase,
		body: "Want to work at YouTube? Check out our careers page to hear from current employees and find available positions.",
	},
	{
		id: "merch",
		title: "Merchandise",
		icon: Shirt,
		body: "Sunglasses, T-shirts, backpacks—we've got a whole online store filled with YouTube merchandise for your purchasing pleasure.",
	},
];

const SIDE_LINKS = [
	{ id: "about-yt", label: "About YouTube", active: true },
	{ id: "getting-started", label: "Getting Started" },
	{ id: "essentials", label: "YouTube Essentials" },
	{ id: "community", label: "Community Guidelines" },
	{ id: "contact", label: "Contact Us" },
	{ id: "careers", label: "Careers" },
	{ id: "merch", label: "YouTube Merchandise" },
];

const SUBNAV = [
	{ id: "about", label: "About", active: true },
	{ id: "press", label: "Press & Blogs" },
	{ id: "copyright", label: "Copyright" },
	{ id: "partners", label: "Creators & Partners" },
	{ id: "advertising", label: "Advertising" },
	{ id: "developers", label: "Developers" },
	{ id: "help", label: "Help" },
];

function About() {
	return (
		<main className="yt-page-wide px-2 py-4 sm:px-4">
			{/* Dark sub-nav strip */}
			<div className="yt-subnav mb-4 flex flex-wrap items-stretch rounded-[2px]">
				{SUBNAV.map((item) => (
					<Link
						key={item.id}
						to="/about"
						className={item.active ? "is-active" : undefined}
					>
						{item.label}
					</Link>
				))}
			</div>

			<div className="grid grid-cols-1 gap-4 md:grid-cols-[180px_minmax(0,1fr)]">
				{/* Sidebar nav */}
				<aside>
					<div className="yt-box overflow-hidden">
						{SIDE_LINKS.map((link) => (
							<a
								key={link.id}
								href={`#${link.id}`}
								className={`yt-side-item ${link.active ? "is-active" : ""}`}
							>
								{link.label}
							</a>
						))}
					</div>
				</aside>

				{/* Main content card */}
				<section className="yt-box">
					<div className="yt-section-title text-[14px]">About YouTube</div>

					<div className="px-5 py-4">
						<p className="m-0 mb-2 text-[12px] leading-[1.7] text-[var(--yt-text)]">
							Founded in February 2005, YouTube allows billions of people to
							discover, watch and share originally-created videos. YouTube
							provides a forum for people to connect, inform, and inspire others
							across the globe and acts as a distribution platform for original
							content creators and advertisers large and small. See our company{" "}
							<a href="#timeline" className="font-bold">
								timeline
							</a>{" "}
							for more information on our company history.
						</p>

						<div className="mt-5 grid grid-cols-1 gap-x-6 sm:grid-cols-2">
							{TILES.map((tile) => {
								const Icon = tile.icon;
								return (
									<div key={tile.id} className="yt-tile">
										<div className="yt-tile-icon">
											<Icon size={32} />
										</div>
										<div className="min-w-0">
											<a
												href={`#${tile.id}`}
												className="block text-[14px] font-bold"
											>
												{tile.title}
											</a>
											<p className="m-0 mt-1 text-[12px] leading-[1.5] text-[var(--yt-text-soft)]">
												{tile.body}
											</p>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</section>
			</div>
		</main>
	);
}
