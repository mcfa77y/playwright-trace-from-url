import chalk from "chalk";
import ora, { type Ora } from "ora";

export const logger = {
	info: (msg: string) => console.log(chalk.blue("ℹ ") + msg),
	success: (msg: string) => console.log(chalk.green("✔ ") + msg),
	warn: (msg: string) => console.log(chalk.yellow("⚠ ") + msg),
	error: (msg: string) => console.error(chalk.red("✖ ") + msg),
	dim: (msg: string) => console.log(chalk.dim(msg)),
	banner: (msg: string) => console.log(chalk.cyan.bold(msg)),
};

export const createSpinner = (text: string): Ora => {
	return ora({
		text,
		color: "cyan",
		spinner: "dots",
	});
};
