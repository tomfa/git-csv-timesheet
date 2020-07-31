import { RepoWorkSummary } from './types';

export const printAsCSV = (work: RepoWorkSummary) => {
  console.log(JSON.stringify(work, undefined, 2))
};
