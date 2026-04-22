import { HelpCircle } from "lucide-react";
import { YouTubeLogo } from "./YouTubeLogo";

export default function Footer() {
	return (
		<footer className="mt-8 border-t border-[var(--yt-border)] bg-[#ededed] py-6">
			<div className="yt-page-wide flex flex-col gap-4 text-[12px] text-[var(--yt-text-soft)] md:flex-row md:items-start md:justify-between">
				<div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-4">
					<YouTubeLogo size={18} />

					<nav className="flex flex-wrap items-center gap-x-3 gap-y-1 font-bold text-[var(--yt-text)]">
						<a href="#about">About</a>
						<a href="#press">Press &amp; Blogs</a>
						<a href="#copyright">Copyright</a>
						<a href="#partners">Creators &amp; Partners</a>
						<a href="#advertising">Advertising</a>
						<a href="#developers">Developers</a>
					</nav>
				</div>

				<div className="flex flex-shrink-0 items-start gap-2">
					<button
						type="button"
						className="yt-btn yt-btn-lg gap-2"
						aria-label="Help"
					>
						<HelpCircle size={14} />
						Help
						<span className="yt-triangle-down" />
					</button>
				</div>
			</div>

			<div className="yt-page-wide mt-3 flex flex-wrap items-center gap-4 text-[12px]">
				<nav className="flex flex-wrap items-center gap-x-3 gap-y-1">
					<a href="#terms">Terms</a>
					<span className="font-bold text-[var(--yt-red)]">New</span>
					<a href="#privacy">Privacy</a>
					<a href="#safety">Safety</a>
					<a href="#bug">Report a bug</a>
					<a href="#trynew">Try something new!</a>
				</nav>
			</div>

			<div className="yt-page-wide mt-3 flex flex-wrap items-center gap-2">
				<label className="flex items-center gap-1 text-[var(--yt-text-soft)]">
					<select
						className="yt-btn min-w-[90px] cursor-pointer appearance-none pr-6"
						defaultValue="en"
					>
						<option value="en">English</option>
						<option value="es">Español</option>
						<option value="fr">Français</option>
					</select>
				</label>
				<label className="flex items-center gap-1 text-[var(--yt-text-soft)]">
					<select
						className="yt-btn min-w-[110px] cursor-pointer appearance-none pr-6"
						defaultValue="worldwide"
					>
						<option value="worldwide">Worldwide</option>
						<option value="us">United States</option>
					</select>
				</label>
				<span className="text-[var(--yt-text-soft)]">
					Safety:{" "}
					<button
						type="button"
						className="yt-btn inline-flex items-center gap-1"
					>
						Off <span className="yt-triangle-down" />
					</button>
				</span>
			</div>
		</footer>
	);
}
