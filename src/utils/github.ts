import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import * as cliProgress from "cli-progress";
import { logger } from "./logger.js";

export interface GithubArtifactInfo {
	owner: string;
	repo: string;
	runId: string;
	artifactId: string;
}

export const parseGithubUrl = (url: string): GithubArtifactInfo => {
	const regex =
		/github\.com\/([^/]+)\/([^/]+)\/actions\/runs\/([^/]+)\/artifacts\/([^/]+)/;
	const match = url.match(regex);

	if (!match || match.length < 5) {
		throw new Error("Invalid GitHub artifact URL format.");
	}

	const [, owner, repo, runId, artifactId] = match;

	if (!owner || !repo || !runId || !artifactId) {
		throw new Error("Invalid GitHub artifact URL: missing components.");
	}

	return { owner, repo, runId, artifactId };
};

export const downloadArtifact = async (
	info: GithubArtifactInfo,
	destDir: string,
) => {
	const repoFull = `${info.owner}/${info.repo}`;
	try {
		// Get artifact metadata
		const metadata = JSON.parse(
			execSync(
				`gh api repos/${repoFull}/actions/artifacts/${info.artifactId}`,
				{
					encoding: "utf8",
				},
			),
		);

		const artifactName = metadata.name;
		const downloadUrl = metadata.archive_download_url;

		// Get the token from gh cli
		const token = execSync("gh auth token", { encoding: "utf8" }).trim();

		logger.info(`Downloading artifact: ${artifactName}...`);

		const formatSize = (bytes: number) => {
			if (bytes === 0) return "0 B";
			const k = 1024;
			const sizes = ["B", "KB", "MB", "GB"];
			const i = Math.floor(Math.log(bytes) / Math.log(k));
			return `${(bytes / k ** i).toFixed(2)} ${sizes[i]}`;
		};

		const progressBar = new cliProgress.SingleBar(
			{
				format:
					"Downloading | {bar} | {percentage}% | {formattedValue}/{formattedTotal} | {speed} | ETA: {eta}s",
				barCompleteChar: "\u2588",
				barIncompleteChar: "\u2591",
				hideCursor: true,
			},
			cliProgress.Presets.shades_classic,
		);

		const response = await axios({
			url: downloadUrl,
			method: "GET",
			responseType: "stream",
			headers: {
				Authorization: `Bearer ${token}`,
			},
		});

		const totalLength = Number.parseInt(response.headers["content-length"], 10);
		const startTime = Date.now();

		progressBar.start(totalLength || 100, 0, {
			formattedValue: formatSize(0),
			formattedTotal: formatSize(totalLength || 0),
			speed: "0 B/s",
		});

		const zipPath = path.join(destDir, `${artifactName}.zip`);
		const writer = fs.createWriteStream(zipPath);

		let downloadedLength = 0;
		response.data.on("data", (chunk: Buffer) => {
			downloadedLength += chunk.length;
			const elapsedMs = Date.now() - startTime;
			const speedBytesPerMs = elapsedMs > 0 ? downloadedLength / elapsedMs : 0;
			const speedBytesPerSec = speedBytesPerMs * 1000;

			progressBar.update(downloadedLength, {
				formattedValue: formatSize(downloadedLength),
				speed: `${formatSize(speedBytesPerSec)}/s`,
			});
		});

		response.data.pipe(writer);

		return new Promise<string>((resolve, reject) => {
			writer.on("finish", () => {
				progressBar.stop();
				resolve(zipPath);
			});
			writer.on("error", (err) => {
				progressBar.stop();
				reject(err);
			});
		});
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to download artifact: ${error.message}`);
		}
		throw error;
	}
};
