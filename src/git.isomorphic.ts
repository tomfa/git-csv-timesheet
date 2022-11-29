import * as fs from 'fs';
import * as isoGit from 'isomorphic-git';

import { Commit } from './types';
import { generateUniquesBasedOnKeyFilter } from './git.utils';

type Props = {
  gitPath: string;
  countMerges: boolean;
  since: 'always' | Date;
  until: 'always' | Date;
};

async function getBranchNames(args: Props): Promise<string[]> {
  return isoGit.listBranches({ fs, dir: args.gitPath });
}

export async function getCommitsForRepository({
  gitPath,
  countMerges,
  since,
  until,
}: Props): Promise<Commit[]> {
  const branchNames = await getBranchNames({
    gitPath,
    countMerges,
    since,
    until,
  });

  const allCommits: Commit[] = [];
  const cache = {};
  const branchCommits = await Promise.all(
    branchNames.map((ref) =>
      getBranchCommits({ ref, since, until, dir: gitPath, cache }),
    ),
  );
  branchCommits.forEach((commitList) =>
    commitList.forEach((commit) => allCommits.push(commit)),
  );

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

async function getBranchCommits({
  ref,
  dir,
  since,
  until,
  cache,
}: {
  ref: string;
  dir: string;
  since: Date | 'always';
  until: Date | 'always';
  cache?: Record<string, unknown>;
}): Promise<Commit[]> {
  let commits = await isoGit.log({
    ref,
    fs,
    dir,
    cache,
    since: since === 'always' ? undefined : since,
  });
  if (until !== 'always') {
    const maxAge = Math.ceil(until.getTime() / 1000);
    commits = commits.filter((c) => c.commit.committer.timestamp < maxAge);
  }

  return commits.map((c) => ({
    sha: c.oid,
    author: { email: c.commit.author.email, name: c.commit.author.name },
    date: new Date(c.commit.committer.timestamp * 1000),
    message: c.commit.message,
    repo: dir,
  }));
}
