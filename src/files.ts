import fs = require('fs');
import path = require('path');

export const getHomeDir = (): string =>
  process.platform === 'win32' ? process.env.USERPROFILE : process.env.HOME;

export const readJSON = (
  absolutPath: string,
  defaultData: Record<string, any> = {},
): Record<string, any> => {
  const rawData = fs.readFileSync(absolutPath, 'utf8');
  const data = JSON.parse(rawData);
  return { ...defaultData, ...data };
};

export const readHomeDirectoryConfig = (
  filename: string,
  defaultData: Record<string, any> = {},
) => {
  const absolutePath = path.resolve(getHomeDir(), filename);
  return readJSON(absolutePath, defaultData);
};
