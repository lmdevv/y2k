import { Link } from "@tanstack/react-router";
import { cn } from "#/lib/utils";

/**
 * Old YouTube wordmark: black "You" + red rounded "Tube" pill.
 * `size` controls overall font-size; everything else scales via em.
 */
export function YouTubeLogo({
	size = 26,
	className,
	withLink = true,
}: {
	size?: number;
	className?: string;
	withLink?: boolean;
}) {
	const inner = (
		<span
			className={cn("yt-logo", className)}
			style={{ fontSize: `${size}px` }}
			role="img"
			aria-label="YouTube"
		>
			<span className="yt-logo-you">You</span>
			<span className="yt-logo-tube">Tube</span>
		</span>
	);

	if (!withLink) return inner;

	return (
		<Link to="/" className="inline-flex">
			{inner}
		</Link>
	);
}
