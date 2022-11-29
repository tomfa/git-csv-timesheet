import * as nodeGit from 'nodegit';
import * as moment from 'moment';

import { Commit } from './types';
import { generateUniquesBasedOnKeyFilter } from './git.utils';

export async function getCommitsForRepository({
  gitPath,
  countMerges,
  since,
  until,
}: {
  gitPath: string;
  countMerges: boolean;
  since: 'always' | Date;
  until: 'always' | Date;
}): Promise<Commit[]> {
  const repository = await nodeGit.Repository.open(gitPath);
  const tagsAndBranches = await getAllReferences(repository);
  const branches = tagsAndBranches.filter((r) => r.match(/refs\/heads\/.*/));

  const allCommits: Commit[] = [];
  const latestBranchCommits: nodeGit.Commit[] = await Promise.all(
    branches.map((branchName) => getBranchLatestCommit(repository, branchName)),
  );
  const branchCommits = await Promise.all(
    latestBranchCommits.map((latestCommit) =>
      getBranchCommits({ latestCommit, since, until, repository }),
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

function getAllReferences(repo: nodeGit.Repository): Promise<string[]> {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  return repo.getReferenceNames(nodeGit.Reference.TYPE.ALL);
}

async function getBranchLatestCommit(
  repo: nodeGit.Repository,
  branchName: string,
): Promise<nodeGit.Commit> {
  const branch = await repo.getBranch(branchName);
  return repo.getBranchCommit(branch.name());
}

async function getBranchCommits({
  latestCommit,
  repository,
  since,
  until,
}: {
  latestCommit: nodeGit.Commit;
  repository?: nodeGit.Repository;
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
