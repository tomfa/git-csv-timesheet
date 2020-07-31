export type EmailAliases = {
  [email: string]: string;
};
export type RepoAuthorContribution = { hours: number; commits: number };

export type CommitSummary = { timestamps: Date[] }
export type RepoWorkSummary = { [email: string]: RepoAuthorContribution }

export type Config = {
  maxCommitDiffInMinutes: number;
  firstCommitAdditionInMinutes: number;
  since: string | Date;
  until: string | Date;
  countMerges: boolean;
  gitPath: string;
  authors: Array<string>;
  emailAliases: EmailAliases;
  branch: string | null;
};

export type RepositoryConfig = {
  project: string;
  path: string;
  countMerges: boolean;
  trackTasks: boolean;
}

export type HomeDirectoryConfig = {
  maxCommitDiffInMinutes: number;
  firstCommitAdditionInMinutes: number;
  countMerges: boolean;
  emailAliases: EmailAliases;
  branch: string | null;
  authors: Array<string>;
  repositories: Array<string | RepositoryConfig>;
}
