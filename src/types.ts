export type EmailAliases = {
  [email: string]: string;
};
export type RepoAuthorContribution = { name: string; hours: number; commits: number };

export type Config = {
  maxCommitDiffInMinutes: number;
  firstCommitAdditionInMinutes: number;
  since: string | Date;
  until: string | Date;
  countMerges: boolean;
  gitPath: string;
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
  repositories: Array<string | RepositoryConfig>;
}
