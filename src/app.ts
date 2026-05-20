import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { addToHistory } from "./utils/config.js";
import { cleanup, ensureDir, extractZip } from "./utils/file.js";
import { downloadArtifact, parseGithubUrl } from "./utils/github.js";
import { createSpinner, logger } from "./utils/logger.js";

export const run = async (url: string) => {
	const tempDir = path.join(os.tmpdir(), `playwright-trace-${Date.now()}`);
	const downloadDir = path.join(tempDir, "download");
	const extractDir = path.join(tempDir, "report");

	ensureDir(downloadDir);
	ensureDir(extractDir);

	try {
		addToHistory(url);
		const info = parseGithubUrl(url);

		const spinner = createSpinner("Fetching artifact info...").start();

		let zipPath: string;
		try {
			spinner.stop(); // Stop spinner to let progress bar show
			zipPath = await downloadArtifact(info, downloadDir);
			logger.success("Artifact downloaded.");
		} catch (error) {
			spinner.fail("Failed to download artifact.");
			throw error;
		}

		const extractSpinner = createSpinner("Extracting artifact...").start();
		try {
			await extractZip(zipPath, extractDir);
			extractSpinner.succeed("Artifact extracted.");
		} catch (error) {
			extractSpinner.fail("Failed to extract artifact.");
			throw error;
		}

		logger.info("Starting Playwright report viewer...");
		logger.dim("Press Ctrl+C to stop and cleanup.");

		// Run playwright show-report
		const child = spawn("npx", ["playwright", "show-report", extractDir], {
			stdio: "inherit",
			shell: true,
		});

		return new Promise<void>((resolve, reject) => {
			child.on("close", (code) => {
				cleanup(tempDir);
				resolve();
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
