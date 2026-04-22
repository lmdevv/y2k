import { Search } from "lucide-react";
import { YouTubeLogo } from "./YouTubeLogo";

export default function NotFound() {
	return (
		<main className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-20 text-center">
			<div className="yt-sad" aria-hidden="true">
				<div className="yt-sad-box" />
				<div className="yt-sad-eye is-left" />
				<div className="yt-sad-eye is-right" />
				<div className="yt-sad-mouth" />
			</div>

			<p className="mt-8 max-w-md text-[14px] leading-[1.6] text-[var(--yt-text-soft)]">
				We're sorry, the page you requested cannot be found. Try searching
				<br />
				for something else.
			</p>

			<form
				className="mt-6 flex items-stretch"
				onSubmit={(e) => e.preventDefault()}
			>
				<YouTubeLogo size={22} withLink={false} />
				<div className="ml-3 flex items-stretch">
					<label htmlFor="nf-search" className="sr-only">
						Search
					</label>
					<input
						id="nf-search"
						type="search"
						className="yt-search h-[30px] w-[280px] rounded-none rounded-l-[2px] px-2 text-[13px] outline-none"
					/>
					<button
						type="submit"
						className="flex w-10 items-center justify-center rounded-none rounded-r-[2px] border border-l-0 border-[#b5b5b5] bg-[linear-gradient(180deg,#fdfdfd_0%,#e4e4e4_100%)] text-[#555] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]"
						aria-label="Search"
					>
						<Search size={14} strokeWidth={3} />
					</button>
				</div>
			</form>
		</main>
	);
}
