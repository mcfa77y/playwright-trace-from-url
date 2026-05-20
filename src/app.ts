import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import dayjs from "dayjs";
import duration from "dayjs/plugin/duration";
import { addToHistory } from "./utils/config.js";
import {
	cleanup,
	ensureDir,
	extractZip,
	getDirStats,
	listDirs,
} from "./utils/file.js";
import { downloadArtifact, parseGithubUrl } from "./utils/github.js";
import { createSpinner, logger } from "./utils/logger.js";

dayjs.extend(duration);

const TRACES_DIR = path.join(process.cwd(), ".traces");

const runCleanup = async () => {
	const dirs = listDirs(TRACES_DIR);
	const now = dayjs();
	let deletedCount = 0;

	for (const dirName of dirs) {
		const dirPath = path.join(TRACES_DIR, dirName);
		const stats = getDirStats(dirPath);
		const createdAt = dayjs(stats.birthtime);

		if (now.diff(createdAt, "day") >= 1) {
			cleanup(dirPath);
			deletedCount++;
		}
	}

	if (deletedCount > 0) {
		logger.info(`Cleaned up ${deletedCount} trace(s) older than 1 day.`);
	}
};

export const run = async (url: string) => {
	// Run cleanup on start
	await runCleanup();

	const traceId = `trace-${dayjs().format("YYYYMMDD-HHmmss")}`;
	const currentTraceDir = path.join(TRACES_DIR, traceId);
	const downloadDir = path.join(currentTraceDir, "download");
	const extractDir = path.join(currentTraceDir, "report");

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
		logger.dim("The trace is saved locally and will be kept for 24 hours.");
		logger.dim(`Path: ${extractDir}`);

		// Run playwright show-report
		const child = spawn("npx", ["playwright", "show-report", extractDir], {
			stdio: "inherit",
			shell: true,
		});

		return new Promise<void>((resolve, reject) => {
			child.on("close", () => {
				// We no longer cleanup here
				resolve();
			});

			child.on("error", (err) => {
				reject(err);
			});

			// Handle process termination
			process.on("SIGINT", () => {
				child.kill();
				process.exit(0);
			});
		});
	} catch (error) {
		if (error instanceof Error) {
			logger.error(error.message);
		} else {
			logger.error("An unknown error occurred.");
		}
		process.exit(1);
	}
};
