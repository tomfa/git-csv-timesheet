import * as nodeGit from './git.nodegit';
import { Commit } from './types';
import logger from './logger';
import { isShallowGitRepo } from './git.utils';

export async function getCommits({
  gitPaths,
  countMerges,
  since,
  until,
}: {
  gitPaths: string[];
  countMerges: boolean;
  since: string | Date;
  until: string | Date;
}): Promise<Commit[]> {
  const listOfCommitLists: Commit[][] = await Promise.all(
    gitPaths.map(async (path) =>
      getCommitsForRepository({
        gitPath: path,
        countMerges,
        since,
        until,
      }),
    ),
  );
  return listOfCommitLists.reduce(
    (flattenedList, currentList) => [...flattenedList, ...currentList],
    [],
  );
}

export async function getCommitsForRepository(args: {
  gitPath: string;
  countMerges: boolean;
  since: string | Date;
  until: string | Date;
}): Promise<Commit[]> {
  if (isShallowGitRepo(args.gitPath)) {
    logger.warn(`Cannot analyze shallow git repo: ${args.gitPath}!`);
    logger.warn(
      `To fix this issue: run git fetch --unshallow inside ${args.gitPath}`,
    );
    return [];
  }

  return nodeGit.getCommitsForRepository(args);
}
