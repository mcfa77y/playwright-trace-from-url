#!/usr/bin/env bun
import figlet from "figlet";
import { run } from "./app.js";
import { setupCommands } from "./cli/commands.js";
import { promptForUrl } from "./cli/prompts.js";
import { logger } from "./utils/logger.js";

const displayBanner = () => {
	console.log("");
	console.log(figlet.textSync("Trace View", { font: "Slant" }));
	logger.banner(" Playwright Artifact Downloader");
	console.log("");
};

const main = async () => {
	displayBanner();

	const { url: argUrl } = setupCommands();

	let url = argUrl;
	if (!url) {
		url = await promptForUrl();
	}

	if (!url) {
		logger.error("No URL provided. Exiting.");
		process.exit(1);
	}

	await run(url);
};

main().catch((err) => {
	logger.error(err instanceof Error ? err.message : String(err));
	process.exit(1);
});
