import fs from 'fs';

import git, { Commit as GitCommit, Repository } from 'nodegit';
import moment from 'moment';

import { Commit } from './types';
import logger from './logger';

export function isShallowGitRepo(path: string): boolean {
  return fs.existsSync(path + '.git/shallow');
}

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

export async function getCommitsForRepository({
  gitPath,
  countMerges,
  since,
  until,
}: {
  gitPath: string;
  countMerges: boolean;
  since: string | Date;
  until: string | Date;
}): Promise<Commit[]> {
  if (isShallowGitRepo(gitPath)) {
    logger.warn(`Cannot analyze shallow git repo: ${gitPath}!`);
    logger.warn(
      `To fix this issue: run git fetch --unshallow inside ${gitPath}`,
    );
    return [];
  }

  const repository: Repository = await git.Repository.open(gitPath);
  const allReferences = await getAllReferences(repository);
  const references = allReferences.filter((r) => r.match(/refs\/heads\/.*/));

  const allCommits = [];
  const latestBranchCommits: GitCommit[] = await Promise.all(
    references.map((branchName) =>
      getBranchLatestCommit(repository, branchName),
    ),
  );
  const branchCommits = await Promise.all(
    latestBranchCommits.map((latestCommit) =>
      getBranchCommits({ latestCommit, since, until, repository }),
    ),
  );
  branchCommits.forEach((c) => allCommits.push(c));

  // Multiple branches might share commits, so take unique
  const uniqueCommits = allCommits.filter(
    generateUniquesBasedOnKeyFilter('sha'),
  );

  if (countMerges) {
    return uniqueCommits;
  }

  const isNotMergeCommit = (commit) => !commit.message.startsWith('Merge ');
  return uniqueCommits.filter(isNotMergeCommit);
}

function getAllReferences(repo: Repository): Promise<string[]> {
  return repo.getReferenceNames(git.Reference.TYPE.ALL);
}

export async function getBranchLatestCommit(
  repo: Repository,
  branchName: string,
): Promise<GitCommit> {
  const branch = await repo.getBranch(branchName);
  return repo.getBranchCommit(branch.name());
}

export async function getBranchCommits({
  latestCommit,
  repository,
  since,
  until,
}: {
  latestCommit: GitCommit;
  repository?: Repository;
  since: string | Date;
  until: string | Date;
}): Promise<Commit[]> {
  if (!repository) {
    // eslint-disable-next-line no-param-reassign
    repository = latestCommit.owner();
  }
  return new Promise((resolve, reject) => {
    const history = latestCommit.history();
    const commits = [];

    history.on('commit', (commit) => {
      const commitAuthor = commit.author();
      const author = commitAuthor
        ? { name: commitAuthor.name(), email: commitAuthor.email() }
        : { name: 'unknown', email: 'unknown@example.com' };

      const commitData: Commit = {
        sha: commit.sha(),
        date: commit.date(),
        message: commit.message(),
        author,
        repo: repository.commondir().replace('/.git/', ''),
      };

      const commitDate = moment(commitData.date.toISOString());
      const sinceAlways = since === 'always' || !since;
      const isValidSince = sinceAlways || commitDate.isAfter(since);

      const untilAlways = until === 'always' || !until;
      const isValidUntil = untilAlways || commitDate.isBefore(until);

      if (isValidSince && isValidUntil) {
        commits.push(commitData);
      }
    });

    history.on('end', () => resolve(commits));
    history.on('error', (err) => reject(err));
    history.start();
  });
}

const generateUniquesBasedOnKeyFilter = (key: string) => {
  const uniques = new Set();
  return (item) => {
    const alreadyAdded = uniques.has(item[key]);
    if (!alreadyAdded) {
      uniques.add(item[key]);
    }
    return !alreadyAdded;
  };
};
