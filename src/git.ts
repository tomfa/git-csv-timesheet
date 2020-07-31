import { Commit as GitCommit, Repository } from 'nodegit';
const git = require('nodegit');
const _ = require('lodash');
const moment = require('moment');
const fs = require('fs');

import { Commit, Config } from './types';


export function isShallowGitRepo(path: string): boolean {
  return fs.existsSync(path + '.git/shallow');
}

// Promisify nodegit's API of getting all commits in repository
export async function getCommits(
  gitPath: string,
  branch: string | null,
  config: Config,
): Promise<Commit[]> {
  const repo: Repository = await git.Repository.open(gitPath);
  const allReferences = await getAllReferences(repo);

  let references;
  if (branch) {
    references = allReferences.filter((r) => r === 'refs/heads/' + branch);
  } else {
    references = allReferences.filter((r) => r.match(/refs\/heads\/.*/));
  }

  const allCommits = [];
  const latestBranchCommits: GitCommit[] = await Promise.all(
    references.map((branchName) => getBranchLatestCommit(repo, branchName)),
  );
  for (const latestCommit of latestBranchCommits) {
    // TODO: This is a sync loop with an parallelizable call. Make Promise?
    const branchCommits = await getBranchCommits(latestCommit, config);
    branchCommits.forEach((c) => allCommits.push(c));
  }

  // Multiple branches might share commits, so take unique
  const uniqueCommits = _.uniq(allCommits, function (item, key, a) {
    return item.sha;
  });

  if (config.countMerges) {
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

export async function getBranchCommits(
  branchLatestCommit: GitCommit,
  config: Config,
  repository?: Repository
): Promise<Commit[]> {
  if (!repository) {
    repository = branchLatestCommit.owner()
  }
  return new Promise(function (resolve, reject) {
    const history = branchLatestCommit.history();
    const commits = [];

    history.on('commit', function (commit) {
      let author = null;
      if (!_.isNull(commit.author())) {
        author = {
          name: commit.author().name(),
          email: commit.author().email(),
        };
      }

      const commitData: Commit = {
        sha: commit.sha(),
        date: commit.date(),
        message: commit.message(),
        author: author,
        repo: repository.commondir().replace('/.git/', '')
      };

      let isValidSince = true;
      const sinceAlways = config.since === 'always' || !config.since;
      if (
        sinceAlways ||
        moment(commitData.date.toISOString()).isAfter(config.since)
      ) {
        isValidSince = true;
      } else {
        isValidSince = false;
      }

      let isValidUntil = true;
      const untilAlways = config.until === 'always' || !config.until;
      if (
        untilAlways ||
        moment(commitData.date.toISOString()).isBefore(config.until)
      ) {
        isValidUntil = true;
      } else {
        isValidUntil = false;
      }

      if (isValidSince && isValidUntil) {
        commits.push(commitData);
      }
    });

    history.on('end', function () {
      resolve(commits);
    });

    history.on('error', function (err) {
      reject(err);
    });

    // Start emitting events.
    history.start();
  });
}
