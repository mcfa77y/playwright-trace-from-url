import fs from "node:fs";
import unzipper from "unzipper";

export const ensureDir = (dir: string) => {
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}
};

export const cleanup = (dir: string) => {
	if (fs.existsSync(dir)) {
		fs.rmSync(dir, { recursive: true, force: true });
	}
};

export const extractZip = async (zipPath: string, destDir: string) => {
	await fs
		.createReadStream(zipPath)
		.pipe(unzipper.Extract({ path: destDir }))
		.promise();
};

export const isZipFile = (filePath: string) => {
	return filePath.endsWith(".zip");
};
