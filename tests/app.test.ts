import { describe, expect, test } from "bun:test";
import { parseGithubUrl } from "../src/utils/github";

describe("GitHub URL Parser", () => {
	test("should correctly parse a valid GitHub artifact URL", () => {
		const url =
			"https://github.com/EmpoHealth/core/actions/runs/26165482740/artifacts/7112617984";
		const info = parseGithubUrl(url);

		expect(info.owner).toBe("EmpoHealth");
		expect(info.repo).toBe("core");
		expect(info.runId).toBe("26165482740");
		expect(info.artifactId).toBe("7112617984");
	});

	test("should throw an error for an invalid URL", () => {
		const url = "https://google.com";
		expect(() => parseGithubUrl(url)).toThrow(
			"Invalid GitHub artifact URL format.",
		);
	});
});
