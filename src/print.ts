import { CompleteSummary } from './types';

const CSV_SEPARATOR = ';';
const DECIMAL_POINTS_PRECISION = 1;

enum PrintColumn {
  AUTHOR = 'author',
  DATE = 'date',
  PROJECT = 'project', // No support yet
  REPOSITORY = 'repository',
  TASK = 'task', // No support yet
  HOURS = 'hours',
}
type PrintArgs = {
  summary: CompleteSummary;
  columns?: PrintColumn[];
};
type FlatSummaryItem = {
  [PrintColumn.AUTHOR]: string;
  [PrintColumn.DATE]: string;
  [PrintColumn.HOURS]: number;
  [PrintColumn.REPOSITORY]: string;
};

const output = (...args: any[]) => console.log(...args);

const flattenSummary = (summary: CompleteSummary): FlatSummaryItem[] => {
  const flatSummary = [] as FlatSummaryItem[];
  Object.keys(summary).forEach((repository) => {
    const repositorySummary = summary[repository];
    Object.keys(repositorySummary).forEach((author) => {
      const authorSummary = repositorySummary[author];
      Object.keys(authorSummary).forEach((date) => {
        const { hours } = authorSummary[date];
        flatSummary.push({ date, hours, author, repository });
      });
    });
  });
  return flatSummary.sort(
    getSortByKeysFilter(
      PrintColumn.AUTHOR,
      PrintColumn.DATE,
      PrintColumn.REPOSITORY,
    ),
  );
};
const DEFAULT_PRINT_LINES = [
  PrintColumn.AUTHOR,
  PrintColumn.DATE,
  // PrintColumn.PROJECT,
  PrintColumn.REPOSITORY,
  // PrintColumn.TASK,
  PrintColumn.HOURS,
];
export const printAsCSV = ({ summary, columns = undefined }: PrintArgs) => {
  if (columns) {
    throw Error('columns param not yet supported');
  }
  columns = DEFAULT_PRINT_LINES;
  if (getRepositories(summary).length === 1) {
    columns = columns.filter((c) => c !== PrintColumn.REPOSITORY);
  }
  if (getAuthors(summary).length === 1) {
    columns = columns.filter((c) => c !== PrintColumn.AUTHOR);
  }
  const flatSummary = flattenSummary(summary).sort();
  output(columns.join(CSV_SEPARATOR));
  flatSummary.forEach((summaryItem) => {
    const printValues = [];
    columns.forEach((column) => printValues.push(summaryItem[column]));
    output(printValues.map(printColumnsString).join(CSV_SEPARATOR));
  });
  const totalHoursSpent = flatSummary.reduce(
    (timespent, item) => timespent + item.hours,
    0,
  );
  output('-------------------');
  output(`Total hours: ${totalHoursSpent.toFixed(1)}`);
};

export const printAsJSON = ({ summary, columns }: PrintArgs) => {
  output(JSON.stringify(summary, undefined, 2));
};

const getSortByKeysFilter = (
  ...keys: string[]
): ((
  a: Record<string, string | number>,
  b: Record<string, string | number>,
) => number) => (a, b) => {
  for (const key of keys) {
    if (a[key] > b[key]) {
      return 1;
    } else if (a[key] < b[key]) {
      return -1;
    }
  }
  return 0;
};
const getRepositories = (summary: CompleteSummary): string[] => {
  return Object.keys(summary);
};
const getAuthors = (summary: CompleteSummary): string[] => {
  const authorSet = Object.values(summary).reduce((authors, summary) => {
    Object.keys(summary).forEach((author) => authors.add(author));
    return authors;
  }, new Set<string>());
  return Array.from(authorSet);
};

const printColumnsString = (value: any) => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number') {
    return value.toFixed(DECIMAL_POINTS_PRECISION);
  }
  return String(value);
};
