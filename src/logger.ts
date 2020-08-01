/* eslint-disable @typescript-eslint/no-explicit-any, no-console */

interface IO {
  debug: (...args: any) => void;
  verbose: (...args: any) => void;
  output: (...args: any) => void;
  warn: (...args: any) => void;
  error: (...args: any) => void;
}

const logger: IO = {
  debug: console.log,
  verbose: console.log,
  output: console.log,
  warn: console.warn,
  error: (...args: any) => console.error(new Error(args.map(String).join(' '))),
};

export default logger;
