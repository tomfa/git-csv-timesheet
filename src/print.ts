import { CompleteSummary } from './types';

export const printAsCSV = (work: CompleteSummary) => {
  console.log(JSON.stringify(work, undefined, 2))
};
