import * as analyzer from './analyzer';
import * as git from './git';
import logger from './logger';

export default { analyze: analyzer.analyzeTimeSpent, logger, analyzer, git };
