import { input, select } from "@inquirer/prompts";
import { getHistory } from "../utils/config.js";

export const promptForUrl = async (): Promise<string> => {
	const history = getHistory();

	if (history.length === 0) {
		return await input({
			message: "Enter the GitHub artifact URL:",
			validate: (value) =>
				value.startsWith("https://github.com") ||
				"Please enter a valid GitHub URL",
		});
	}

	const choices = [
		...history.map((url) => ({ name: url, value: url })),
		{ name: "Enter a new URL...", value: "NEW" },
	];

	const selected = await select({
		message: "Select a recently used URL or enter a new one:",
		choices,
	});

	if (selected === "NEW") {
		return await input({
			message: "Enter the GitHub artifact URL:",
			validate: (value) =>
				value.startsWith("https://github.com") ||
				"Please enter a valid GitHub URL",
		});
	}

	return selected;
};
