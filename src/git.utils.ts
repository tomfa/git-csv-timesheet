import * as fs from 'fs';

export function isShallowGitRepo(path: string): boolean {
  return fs.existsSync(path + '.git/shallow');
}

export const generateUniquesBasedOnKeyFilter = (key: string) => {
  const uniques = new Set();
  return (item) => {
    const alreadyAdded = uniques.has(item[key]);
    if (!alreadyAdded) {
      uniques.add(item[key]);
    }
    return !alreadyAdded;
  };
};
