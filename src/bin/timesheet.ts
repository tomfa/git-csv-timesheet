#!/usr/bin/env node

import { getConfig } from '../config';
import { parseCommandLineArgs } from './args';
import { analyzeTimeSpent } from '../analyzer';
import { printAsCSV, printAsJSON } from '../print';
import logger from '../logger';

const printReport = () => {
  const commandLineArgs = parseCommandLineArgs();
  const { config, configFilePath } = getConfig(commandLineArgs);
  if (!config.debug) {
    logger.debug = () => {};
  }
  if (!config.verbose) {
    logger.verbose = () => {};
  }
  if (configFilePath) {
    logger.debug(
      `Using config file ${configFilePath}. Can be skipped with flag -i `,
    );
  }
  logger.debug('Config', config);

  analyzeTimeSpent(config).then((summary) => {
    if (config.json) {
      printAsJSON({ summary });
    } else {
      printAsCSV({ summary });
    }
  });
};

printReport();
