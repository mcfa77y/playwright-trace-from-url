import { execSync } from "node:child_process";
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

export const downloadArtifact = (info: GithubArtifactInfo, destDir: string) => {
	const repoFull = `${info.owner}/${info.repo}`;
	try {
		// We can use gh api to get the download URL or gh run download if we knew the name.
		// However, gh api /repos/:owner/:repo/actions/artifacts/:artifact_id/zip is easiest.
		// But gh run download --id is not a thing.
		// Wait, gh run download [run-id] -n [name] works.

		// Let's first get the artifact name using the ID
		const artifactName = execSync(
			`gh api repos/${repoFull}/actions/artifacts/${info.artifactId} --template '{{.name}}'`,
			{ encoding: "utf8" },
		).trim();

		logger.info(`Downloading artifact: ${artifactName}...`);

		execSync(
			`gh run download ${info.runId} -n "${artifactName}" -R ${repoFull} -D "${destDir}"`,
			{ stdio: "inherit" },
		);

		return artifactName;
	} catch (error) {
		if (error instanceof Error) {
			throw new Error(`Failed to download artifact: ${error.message}`);
		}
		throw error;
	}
};
