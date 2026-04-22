import { createFileRoute } from "@tanstack/react-router";
import {
	MessageSquare,
	Plus,
	Send,
	Sparkles,
	Trash2,
	User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import LeftSidebar from "../components/LeftSidebar";

export const Route = createFileRoute("/chat")({ component: ChatPage });

interface ChatMessage {
	id: number;
	role: "user" | "assistant";
	body: string;
	when: string;
}

const CONVERSATIONS = [
	{ id: "c1", title: "How does the YouTube algorithm work?", when: "Today" },
	{ id: "c2", title: "Best 2011 indie movie trailers", when: "Today" },
	{ id: "c3", title: "Explain HTML5 video tag", when: "Yesterday" },
	{ id: "c4", title: "Flash vs HTML5 player", when: "Yesterday" },
	{ id: "c5", title: "Write a description for my vlog", when: "Dec 12" },
	{ id: "c6", title: "Compare VHS and Betamax", when: "Dec 10" },
	{ id: "c7", title: "What is a tubular bell?", when: "Dec 08" },
];

const SUGGESTIONS = [
	"Suggest 5 videos I should watch right now",
	"Write a snarky comment for a cat video",
	"Summarize today's trending clips",
	"Help me title my next upload",
];

const CANNED: Record<string, string> = {
	default:
		"I'm YouBot, a helpful assistant (demo only — no backend wired up). I can chat about videos, uploaders, and general trivia. Try asking me something!",
	algorithm:
		"The recommendation feed uses your watch history, dwell time, likes, and channel subscriptions to surface related videos. In 2011 this was mostly collaborative filtering; modern stacks layer neural ranking on top.",
	flash:
		"Back in 2011 most players still used Adobe Flash. HTML5 video started winning as browsers added MediaSource Extensions and device makers dropped Flash support. Today every major player (including this one) is HTML5.",
	trailer:
		"A strong trailer hook lands in the first 4 seconds, introduces stakes by 0:20, and leaves on a punchline or cliffhanger. For comedies, front-load the biggest laugh.",
};

function fakeReply(prompt: string): string {
	const p = prompt.toLowerCase();
	if (p.includes("algorithm") || p.includes("recommend"))
		return CANNED.algorithm;
	if (p.includes("flash") || p.includes("html5")) return CANNED.flash;
	if (p.includes("trailer") || p.includes("title") || p.includes("description"))
		return CANNED.trailer;
	return CANNED.default;
}

function timestamp(): string {
	const d = new Date();
	const hh = d.getHours().toString().padStart(2, "0");
	const mm = d.getMinutes().toString().padStart(2, "0");
	return `${hh}:${mm}`;
}

function ChatPage() {
	const [messages, setMessages] = useState<ChatMessage[]>([
		{
			id: 1,
			role: "assistant",
			body: "Hi! I'm YouBot, your video-savvy chat buddy. Ask me anything about movies, music, uploaders, or post production. (This is a UI demo — responses are canned.)",
			when: "just now",
		},
	]);
	const [draft, setDraft] = useState("");
	const [isThinking, setIsThinking] = useState(false);
	const [activeChatId, setActiveChatId] = useState<string>(CONVERSATIONS[0].id);
	const nextId = useRef(2);
	const scrollRef = useRef<HTMLDivElement>(null);

	// biome-ignore lint/correctness/useExhaustiveDependencies: we only want to scroll when conversation state changes
	useEffect(() => {
		if (scrollRef.current) {
			scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
		}
	}, [messages, isThinking]);

	function sendMessage(text: string) {
		const trimmed = text.trim();
		if (!trimmed) return;

		const userMsg: ChatMessage = {
			id: nextId.current++,
			role: "user",
			body: trimmed,
			when: timestamp(),
		};
		setMessages((m) => [...m, userMsg]);
		setDraft("");
		setIsThinking(true);

		window.setTimeout(() => {
			const botMsg: ChatMessage = {
				id: nextId.current++,
				role: "assistant",
				body: fakeReply(trimmed),
				when: timestamp(),
			};
			setMessages((m) => [...m, botMsg]);
			setIsThinking(false);
		}, 900);
	}

	function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
		e.preventDefault();
		sendMessage(draft);
	}

	function handleNewChat() {
		setMessages([
			{
				id: nextId.current++,
				role: "assistant",
				body: "New chat started. What do you want to talk about?",
				when: "just now",
			},
		]);
		setDraft("");
	}

	return (
		<main className="yt-page-wide flex gap-4 px-2 py-4 sm:px-4">
			<LeftSidebar />

			<div className="min-w-0 flex-1">
				{/* Beta banner */}
				<div
					className="mb-4 flex h-[80px] items-center gap-4 overflow-hidden rounded-[2px] border border-[var(--yt-border)] px-6 text-white"
					style={{
						background:
							"linear-gradient(90deg, #2a6ec7 0%, #1f5aa8 40%, #153e75 100%)",
					}}
				>
					<Sparkles size={28} className="flex-shrink-0" />
					<div className="text-[18px] font-bold italic leading-tight">
						YOUBOT BETA — CHAT WITH
						<br />
						YOUR FAVORITE VIDEOS.
					</div>
					<div className="ml-auto hidden text-right text-[11px] leading-[1.4] sm:block">
						<div className="font-bold uppercase tracking-wide">Now with</div>
						<div>Super-Intelligent Auto-Reply™</div>
					</div>
				</div>

				<div className="yt-box overflow-hidden">
					<div className="flex items-center border-b border-[var(--yt-border-soft)] bg-[#fafafa]">
						<div className="border-b-2 border-[var(--yt-red)] px-4 py-2 text-[12px] font-bold text-[var(--yt-text)]">
							Chat
						</div>
						<a
							href="#history"
							className="px-4 py-2 text-[12px] font-bold text-[var(--yt-text-soft)]"
						>
							History
						</a>
						<a
							href="#prompts"
							className="px-4 py-2 text-[12px] font-bold text-[var(--yt-text-soft)]"
						>
							Saved Prompts
						</a>
						<div className="ml-auto px-4 text-[11px] text-[var(--yt-text-muted)]">
							Beta
						</div>
					</div>

					<div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)]">
						{/* Conversation list */}
						<div className="border-b border-[var(--yt-border-soft)] bg-[#fafafa] lg:border-b-0 lg:border-r">
							<div className="p-2">
								<button
									type="button"
									onClick={handleNewChat}
									className="yt-btn yt-btn-blue w-full"
								>
									<Plus size={12} /> New chat
								</button>
							</div>
							<div className="px-2 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wide text-[var(--yt-text-muted)]">
								Recent
							</div>
							<div>
								{CONVERSATIONS.map((c) => (
									<button
										key={c.id}
										type="button"
										onClick={() => setActiveChatId(c.id)}
										className={`flex w-full items-start gap-2 border-l-[3px] px-3 py-2 text-left text-[11px] leading-[1.4] hover:bg-[#ededed] ${
											activeChatId === c.id
												? "border-[var(--yt-red)] bg-[#e8e8e8] font-bold text-[var(--yt-text)]"
												: "border-transparent text-[var(--yt-text)]"
										}`}
									>
										<MessageSquare
											size={12}
											className="mt-[2px] flex-shrink-0 text-[var(--yt-text-soft)]"
										/>
										<span className="min-w-0 flex-1 truncate">{c.title}</span>
										<span className="flex-shrink-0 text-[10px] font-normal text-[var(--yt-text-muted)]">
											{c.when}
										</span>
									</button>
								))}
							</div>
							<div className="border-t border-[var(--yt-border-soft)] p-2">
								<button
									type="button"
									className="yt-btn w-full"
									onClick={() => setMessages([])}
								>
									<Trash2 size={11} /> Clear chat
								</button>
							</div>
						</div>

						{/* Conversation pane */}
						<div className="flex min-h-[520px] flex-col bg-white">
							<div
								ref={scrollRef}
								className="flex-1 overflow-y-auto px-4 py-4"
								style={{ maxHeight: "560px" }}
							>
								{messages.length === 0 ? (
									<div className="flex h-full flex-col items-center justify-center text-center text-[var(--yt-text-soft)]">
										<Sparkles
											size={36}
											className="text-[var(--yt-border-strong)]"
										/>
										<p className="mt-3 text-[14px] font-bold text-[var(--yt-text)]">
											Start a new conversation
										</p>
										<p className="mt-1 text-[11px]">
											Pick a suggestion below, or type your own message.
										</p>
									</div>
								) : (
									<div className="flex flex-col gap-4">
										{messages.map((m) => (
											<MessageBubble key={m.id} message={m} />
										))}
										{isThinking ? <ThinkingBubble /> : null}
									</div>
								)}
							</div>

							{/* Suggestion chips */}
							{messages.length <= 1 ? (
								<div className="border-t border-[var(--yt-border-soft)] bg-[#fafafa] px-3 py-2">
									<div className="mb-1 text-[10px] font-bold uppercase tracking-wide text-[var(--yt-text-muted)]">
										Try asking
									</div>
									<div className="flex flex-wrap gap-2">
										{SUGGESTIONS.map((s) => (
											<button
												key={s}
												type="button"
												onClick={() => sendMessage(s)}
												className="yt-btn"
											>
												{s}
											</button>
										))}
									</div>
								</div>
							) : null}

							{/* Composer */}
							<form
								onSubmit={handleSubmit}
								className="flex items-stretch gap-2 border-t border-[var(--yt-border-soft)] bg-[#fafafa] p-3"
							>
								<label htmlFor="yt-chat-input" className="sr-only">
									Message YouBot
								</label>
								<input
									id="yt-chat-input"
									type="text"
									value={draft}
									onChange={(e) => setDraft(e.target.value)}
									placeholder="Message YouBot..."
									className="yt-search flex-1 rounded-[2px] px-2 text-[13px] text-[var(--yt-text)] outline-none"
									autoComplete="off"
								/>
								<button
									type="submit"
									className="yt-btn yt-btn-red yt-btn-lg"
									disabled={!draft.trim() || isThinking}
								>
									<Send size={12} /> Send
								</button>
							</form>

							<div className="border-t border-[var(--yt-border-soft)] bg-[#f4f4f4] px-3 py-1 text-center text-[10px] text-[var(--yt-text-muted)]">
								YouBot may display inaccurate info. Demo UI only — no data is
								stored.
							</div>
						</div>
					</div>
				</div>
			</div>
		</main>
	);
}

function MessageBubble({ message }: { message: ChatMessage }) {
	const isUser = message.role === "user";
	return (
		<div className="flex gap-2">
			<div
				className={`flex size-9 flex-shrink-0 items-center justify-center rounded-[2px] border text-white ${
					isUser
						? "border-[#1f5aa8] bg-[linear-gradient(180deg,#4a90e2_0%,#1f5aa8_100%)]"
						: "border-[#8c0a0e] bg-[linear-gradient(180deg,#e52d27_0%,#a90a10_100%)]"
				}`}
			>
				{isUser ? <User size={16} /> : <Sparkles size={16} />}
			</div>
			<div className="min-w-0 flex-1">
				<div className="mb-1 text-[11px] text-[var(--yt-text-muted)]">
					<span className="font-bold text-[var(--yt-text)]">
						{isUser ? "You" : "YouBot"}
					</span>{" "}
					{message.when}
				</div>
				<div
					className={`rounded-[2px] border px-3 py-2 text-[12px] leading-[1.6] text-[var(--yt-text)] ${
						isUser
							? "border-[var(--yt-banner-border)] bg-[var(--yt-banner-bg)]"
							: "border-[var(--yt-border-soft)] bg-[#fafafa]"
					}`}
				>
					{message.body}
				</div>
			</div>
		</div>
	);
}

function ThinkingBubble() {
	return (
		<div className="flex gap-2">
			<div className="flex size-9 flex-shrink-0 items-center justify-center rounded-[2px] border border-[#8c0a0e] bg-[linear-gradient(180deg,#e52d27_0%,#a90a10_100%)] text-white">
				<Sparkles size={16} />
			</div>
			<div className="min-w-0 flex-1">
				<div className="mb-1 text-[11px] text-[var(--yt-text-muted)]">
					<span className="font-bold text-[var(--yt-text)]">YouBot</span>{" "}
					typing...
				</div>
				<div className="inline-flex items-center gap-1 rounded-[2px] border border-[var(--yt-border-soft)] bg-[#fafafa] px-3 py-2">
					<span className="yt-typing-dot" />
					<span className="yt-typing-dot" style={{ animationDelay: "150ms" }} />
					<span className="yt-typing-dot" style={{ animationDelay: "300ms" }} />
				</div>
			</div>
		</div>
	);
}
