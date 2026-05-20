import Conf from "conf";

interface ConfigSchema {
	history: string[];
}

const config = new Conf<ConfigSchema>({
	projectName: "playwright-trace-from-url",
	defaults: {
		history: [],
	},
});

export const getHistory = () => config.get("history");

export const addToHistory = (url: string) => {
	const history = config.get("history");
	const newHistory = [url, ...history.filter((u) => u !== url)].slice(0, 10);
	config.set("history", newHistory);
};

export const clearHistory = () => config.set("history", []);
