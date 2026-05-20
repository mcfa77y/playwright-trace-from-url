import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { addToHistory } from "./utils/config.js";
import { cleanup, ensureDir } from "./utils/file.js";
import { downloadArtifact, parseGithubUrl } from "./utils/github.js";
import { createSpinner, logger } from "./utils/logger.js";

export const run = async (url: string) => {
	const tempDir = path.join(os.tmpdir(), `playwright-trace-${Date.now()}`);
	ensureDir(tempDir);

	try {
		addToHistory(url);
		const info = parseGithubUrl(url);

		const spinner = createSpinner("Fetching artifact info...").start();

		try {
			downloadArtifact(info, tempDir);
			spinner.succeed("Artifact downloaded.");
		} catch (error) {
			spinner.fail("Failed to download artifact.");
			throw error;
		}

		logger.info("Starting Playwright report viewer...");
		logger.dim("Press Ctrl+C to stop and cleanup.");

		// Run playwright show-report
		// We use spawn to keep it interactive and allow the user to see the output/kill it.
		const child = spawn("npx", ["playwright", "show-report", tempDir], {
			stdio: "inherit",
			shell: true,
		});

		return new Promise<void>((resolve, reject) => {
			child.on("close", (code) => {
				cleanup(tempDir);
				if (code === 0) {
					resolve();
				} else {
					// Playwright show-report might be killed by user, which is fine.
					resolve();
				}
			});

			child.on("error", (err) => {
				cleanup(tempDir);
				reject(err);
			});

			// Handle process termination to ensure cleanup
			process.on("SIGINT", () => {
				child.kill();
				cleanup(tempDir);
				process.exit(0);
			});
		});
	} catch (error) {
		cleanup(tempDir);
		if (error instanceof Error) {
			logger.error(error.message);
		} else {
			logger.error("An unknown error occurred.");
		}
		process.exit(1);
	}
};
