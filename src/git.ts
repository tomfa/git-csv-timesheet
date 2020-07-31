import { Commit as GitCommit, Repository } from 'nodegit';
const git = require('nodegit');
const moment = require('moment');
const fs = require('fs');

import { Commit } from './types';

export function isShallowGitRepo(path: string): boolean {
  return fs.existsSync(path + '.git/shallow');
}

export async function getCommits({
  gitPaths,
  branch,
  countMerges,
  since,
  until,
}: {
  gitPaths: string[];
  branch: string | null;
  countMerges: boolean;
  since: string | Date;
  until: string | Date;
}) {
  const listOfCommitLists: Commit[][] = await Promise.all(
    gitPaths.map(async (path) =>
      getCommitsForRepository({
        gitPath: path,
        branch,
        countMerges,
        since,
        until,
      }),
    ),
  );
  return listOfCommitLists.reduce((flattenedList, currentList) => {
    flattenedList = [...flattenedList, ...currentList];
    return flattenedList;
  }, []);
}

export async function getCommitsForRepository({
  gitPath,
  branch,
  countMerges,
  since,
  until,
}: {
  gitPath: string;
  branch: string | null;
  countMerges: boolean;
  since: string | Date;
  until: string | Date;
}): Promise<Commit[]> {
  if (isShallowGitRepo(gitPath)) {
    console.log(`Cannot analyze shallow git repo: ${gitPath}!`);
    console.log(
      `To fix this issue: run git fetch --unshallow inside ${gitPath}`,
    );
    return [];
  }

  const repository: Repository = await git.Repository.open(gitPath);
  const allReferences = await getAllReferences(repository);

  let references;
  if (branch) {
    references = allReferences.filter((r) => r === 'refs/heads/' + branch);
  } else {
    references = allReferences.filter((r) => r.match(/refs\/heads\/.*/));
  }

  const allCommits = [];
  const latestBranchCommits: GitCommit[] = await Promise.all(
    references.map((branchName) =>
      getBranchLatestCommit(repository, branchName),
    ),
  );
  for (const latestCommit of latestBranchCommits) {
    // TODO: This is a sync loop with an parallelizable call. Make Promise?
    const branchCommits = await getBranchCommits({
      latestCommit,
      since,
      until,
      repository,
    });
    branchCommits.forEach((c) => allCommits.push(c));
  }

  // Multiple branches might share commits, so take unique
  const uniqueCommits = allCommits.filter(generateUniquesBasedOnKeyFilter('sha'));

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
  return await repo.getBranch(branchName).then(function (reference) {
    return repo.getBranchCommit(reference.name());
  });
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
    repository = latestCommit.owner();
  }
  return new Promise(function (resolve, reject) {
    const history = latestCommit.history();
    const commits = [];

    history.on('commit', function (commit) {
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
  return (item => {
    const alreadyAdded = uniques.has(item[key]);
    if (!alreadyAdded) {
      uniques.add(item[key]);
    }
    return !alreadyAdded;
  })
};
