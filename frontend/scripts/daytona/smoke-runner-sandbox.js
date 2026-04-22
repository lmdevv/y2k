import { Daytona } from "@daytona/sdk";
import { randomUUID } from "node:crypto";

const FORWARDED_ENV_KEYS = [
	"ZEN_API_KEY",
	"OPENCODE_CONFIG",
	"OPENCODE_CONFIG_CONTENT",
	"OPENCODE_MODEL",
];

function requiredEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function collectSandboxEnv() {
	return Object.fromEntries(
		FORWARDED_ENV_KEYS.flatMap((name) => {
			const value = process.env[name];
			return value ? [[name, value]] : [];
		}),
	);
}

async function waitForPreview(url, attempts = 20, delayMs = 1500) {
	for (let index = 0; index < attempts; index += 1) {
		try {
			const response = await fetch(url, {
				headers: { "X-Daytona-Skip-Preview-Warning": "true" },
			});
			if (response.ok || response.status === 404) {
				return;
			}
		} catch {
			// Server is still starting.
		}

		await new Promise((resolve) => setTimeout(resolve, delayMs));
	}

	throw new Error("Timed out waiting for OpenCode preview to become reachable");
}

async function main() {
	requiredEnv("DAYTONA_API_KEY");
	const snapshotName = process.env.DAYTONA_RUNNER_SNAPSHOT ?? "y2k-runner";
	const daytona = new Daytona({
		apiKey: process.env.DAYTONA_API_KEY,
		apiUrl: process.env.DAYTONA_API_URL,
	});

	const sandbox = await daytona.create({
		snapshot: snapshotName,
		name: `y2k-runner-smoke-${Date.now()}`,
		language: "typescript",
		envVars: collectSandboxEnv(),
		autoStopInterval: 30,
		autoArchiveInterval: 60 * 24,
		labels: {
			app: "y2k",
			purpose: "runner-smoke",
		},
	});

	console.log(`Sandbox created: ${sandbox.id}`);

	try {
		const verify = await sandbox.process.executeCommand(
			[
				"set -e",
				'printf "opencode: "',
				"opencode --version",
				'printf "manimgl: "',
				"manimgl --version",
				"test -f /workspace/AGENTS.md",
				"test -f /workspace/.agents/skills/manimgl-best-practices/SKILL.md",
				"test -d /workspace/new/scenes",
				"test -d /workspace/new/renders",
				"printf 'workspace seeded correctly\n'",
			].join(" && "),
		);

		process.stdout.write(verify.result);

		const sessionId = `opencode-${randomUUID()}`;
		await sandbox.process.createSession(sessionId);
		await sandbox.process.executeSessionCommand(sessionId, {
			command: "opencode serve --port 4096 --hostname 0.0.0.0",
			runAsync: true,
		});

		const preview = await sandbox.getSignedPreviewUrl(4096, 3600);
		await waitForPreview(preview.url);

		console.log(`OpenCode preview: ${preview.url}`);
		console.log(`Session id: ${sessionId}`);
		console.log("Sandbox is ready for chat/backend integration.");
	} finally {
		if (process.argv.includes("--keep")) {
			console.log(`Keeping sandbox: ${sandbox.id}`);
			return;
		}

		await sandbox.delete();
		console.log(`Sandbox deleted: ${sandbox.id}`);
	}
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
