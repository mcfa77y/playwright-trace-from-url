import { Command } from "commander";

export interface ProgramOptions {
	url?: string;
}

export const setupCommands = () => {
	const program = new Command();

	program
		.name("playwright-trace")
		.description(
			"Download and view Playwright trace artifacts from GitHub Actions",
		)
		.version("1.0.0")
		.argument("[url]", "GitHub artifact URL")
		.option("-u, --url <url>", "GitHub artifact URL")
		.parse(process.argv);

	const options = program.opts<ProgramOptions>();
	const argUrl = program.args[0];

	return {
		url: argUrl || options.url,
	};
};
