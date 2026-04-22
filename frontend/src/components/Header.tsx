import { Link } from "@tanstack/react-router";
import { Search, Star, X } from "lucide-react";
import { useState } from "react";
import { YouTubeLogo } from "./YouTubeLogo";

export default function Header() {
	const [showBanner, setShowBanner] = useState(true);

	return (
		<header className="border-b border-[var(--yt-border)] bg-[#f8f8f8]">
			{/* Top row: logo | search | nav | account */}
			<div className="yt-page-wide flex items-center gap-4 py-3">
				<YouTubeLogo size={28} />

				<form
					className="flex min-w-0 flex-1 items-stretch"
					onSubmit={(e) => e.preventDefault()}
				>
					<label htmlFor="yt-search" className="sr-only">
						Search
					</label>
					<input
						id="yt-search"
						type="search"
						className="yt-search w-full rounded-none rounded-l-[2px] px-2 text-[13px] text-[var(--yt-text)] outline-none"
						placeholder=""
					/>
					<button
						type="submit"
						className="flex w-12 items-center justify-center rounded-none rounded-r-[2px] border border-l-0 border-[#b5b5b5] bg-[linear-gradient(180deg,#fdfdfd_0%,#e4e4e4_100%)] text-[#555] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] hover:bg-[linear-gradient(180deg,#f4f4f4_0%,#d4d4d4_100%)]"
						aria-label="Search"
					>
						<Search size={14} strokeWidth={3} />
					</button>
				</form>

				<nav className="hidden items-center gap-1 text-[12px] text-[var(--yt-text)] md:flex">
					<Link to="/" className="px-2 font-bold hover:underline">
						Browse
					</Link>
					<span className="text-[var(--yt-border-strong)]">|</span>
					<a href="#movies" className="px-2 font-bold hover:underline">
						Movies
					</a>
					<span className="text-[var(--yt-border-strong)]">|</span>
					<a href="#upload" className="px-2 font-bold hover:underline">
						Upload
					</a>
				</nav>

				<div className="flex flex-shrink-0 items-center gap-3 text-[12px]">
					<a href="#create" className="font-bold hover:underline">
						Create Account
					</a>
					<span className="text-[var(--yt-border-strong)]">|</span>
					<a href="#signin" className="font-bold hover:underline">
						Sign In
					</a>
				</div>
			</div>

			{showBanner ? (
				<div className="yt-banner">
					<div className="yt-page-wide flex items-center gap-3 py-2 text-[12px]">
						<span className="flex size-5 items-center justify-center rounded-full bg-white text-[var(--yt-link)] shadow-[inset_0_0_0_1px_var(--yt-banner-border)]">
							<Star size={11} fill="currentColor" strokeWidth={0} />
						</span>
						<p className="m-0 font-bold">
							We're changing our privacy policy.{" "}
							<span className="font-normal">This stuff matters.</span>{" "}
							<a href="#policy" className="font-bold">
								Learn more
							</a>
							<span className="mx-2 text-[var(--yt-banner-border)]">·</span>
							<button
								type="button"
								onClick={() => setShowBanner(false)}
								className="cursor-pointer bg-transparent p-0 font-bold text-[var(--yt-link)] hover:underline"
							>
								Dismiss
							</button>
						</p>
						<button
							type="button"
							onClick={() => setShowBanner(false)}
							aria-label="Close announcement"
							className="ml-auto flex size-5 items-center justify-center text-[var(--yt-link)] hover:text-[var(--yt-link-hover)]"
						>
							<X size={14} strokeWidth={3} />
						</button>
					</div>
				</div>
			) : null}
		</header>
	);
}
