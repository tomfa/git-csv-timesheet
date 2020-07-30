export type EmailAliases = {
  [email: string]: string;
};
export type RepoAuthorContribution = { name: string; hours: number; commits: number };

export type Config = {
  maxCommitDiffInMinutes: number;
  firstCommitAdditionInMinutes: number;
  since: string | Date;
  until: string | Date;
  mergeRequest: boolean;
  gitPath: string;
  emailAliases: EmailAliases;
  branch: string | null;
};
