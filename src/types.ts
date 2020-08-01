export type EmailAliases = {
  [email: string]: string;
};
export type RepoAuthorContribution = {
  [isoDateDay: string]: { hours: number; commits: number };
};

export type CommitSummary = { commits: Commit[] };
export type RepoWorkSummary = { [email: string]: RepoAuthorContribution };
export type CompleteSummary = {
  [repository: string]: RepoWorkSummary;
};
export type CompleteUserSummary = {
  contributions: {
    [repository: string]: RepoAuthorContribution;
  };
  email: string;
};

export type Commit = {
  sha: string;
  date: Date;
  message: string;
  author: { name: string; email: string };
  repo: string;
};

export type RepositoryConfig = {
  project: string;
  path: string;
  countMerges: boolean;
  trackTasks: boolean;
};

export type Config = {
  maxCommitDiffInMinutes: number;
  firstCommitAdditionInMinutes: number;
  since: string | Date;
  until: string | Date;
  countMerges: boolean;
  repositories: Array<string | RepositoryConfig>;
  authors: Array<string>;
  emailAliases: EmailAliases;
  ignoreConfigFile: boolean;
};

export type HomeDirectoryConfig = {
  maxCommitDiffInMinutes: number;
  firstCommitAdditionInMinutes: number;
  countMerges: boolean;
  emailAliases: EmailAliases;
  branch: string | null;
  authors: Array<string>;
  repositories: Array<string | RepositoryConfig>;
};
