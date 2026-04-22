import { Daytona, Image } from "@daytona/sdk";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const frontendDir = path.resolve(scriptDir, "../..");
const repoRoot = path.resolve(frontendDir, "..");
const runnerDockerfile = path.join(repoRoot, "runner", "Dockerfile");

function requiredEnv(name) {
	const value = process.env[name];
	if (!value) {
		throw new Error(`Missing required environment variable: ${name}`);
	}
	return value;
}

function numberEnv(name, fallback) {
	const raw = process.env[name];
	if (!raw) {
		return fallback;
	}

	const parsed = Number(raw);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`Invalid numeric environment variable: ${name}=${raw}`);
	}
	return parsed;
}

function isNotFoundError(error) {
	return error instanceof Error && /not found/i.test(error.message);
}

async function main() {
	requiredEnv("DAYTONA_API_KEY");

	const snapshotName = process.env.DAYTONA_RUNNER_SNAPSHOT ?? "y2k-runner";
	const force = process.argv.includes("--force");
	const cpu = numberEnv("DAYTONA_RUNNER_CPU", 2);
	const memory = numberEnv("DAYTONA_RUNNER_MEMORY", 4);
	const disk = numberEnv("DAYTONA_RUNNER_DISK", 8);

	const daytona = new Daytona({
		apiKey: process.env.DAYTONA_API_KEY,
		apiUrl: process.env.DAYTONA_API_URL,
	});

	if (force) {
		try {
			const existing = await daytona.snapshot.get(snapshotName);
			console.log(`Deleting existing snapshot: ${existing.name}`);
			await daytona.snapshot.delete(existing);
		} catch (error) {
			if (!isNotFoundError(error)) {
				throw error;
			}
		}
	} else {
		try {
			const existing = await daytona.snapshot.get(snapshotName);
			console.log(`Snapshot already exists: ${existing.name}`);
			console.log("Use --force to rebuild it from runner/Dockerfile.");
			return;
		} catch (error) {
			if (!isNotFoundError(error)) {
				throw error;
			}
		}
	}

	console.log(`Building snapshot ${snapshotName} from ${runnerDockerfile}`);
	const image = Image.fromDockerfile(runnerDockerfile);
	const snapshot = await daytona.snapshot.create(
		{
			name: snapshotName,
			image,
			resources: { cpu, memory, disk },
		},
		{
			onLogs: (chunk) => process.stdout.write(chunk),
		},
	);

	console.log(`\nSnapshot ready: ${snapshot.name}`);
	console.log(`Resources: cpu=${cpu} memory=${memory}GiB disk=${disk}GiB`);
	console.log("Next: npm run daytona:smoke");
}

main().catch((error) => {
	console.error(error instanceof Error ? error.message : error);
	process.exitCode = 1;
});
