/**
 * Built-in Skills - Barrel Export
 *
 * Exports all built-in skills as a single array for
 * registration with the skill loader.
 */

import type { KinSkill } from '../types.js';
import { weatherSkill } from './weather.js';
import { calculatorSkill } from './calculator.js';
import { reminderSkill } from './reminder.js';
import { webSearchSkill } from './web-search.js';
import { browserSkill } from './browser.js';
import { emailSkill } from './email.js';
import { scheduleSkill } from './schedule.js';
import { pipelineSkill } from './pipeline.js';
import { videoGenSkill, musicGenSkill } from './media.js';
import { terminalSkill } from './terminal.js';
import { fileManagerSkill } from './file-manager.js';
import { screenshotSkill } from './screenshot.js';
import { appLauncherSkill } from './app-launcher.js';
import { clipboardSkill } from './clipboard.js';

export const builtinSkills: KinSkill[] = [
  weatherSkill,
  calculatorSkill,
  reminderSkill,
  webSearchSkill,
  browserSkill,
  emailSkill,
  scheduleSkill,
  pipelineSkill,
  videoGenSkill,
  musicGenSkill,
  terminalSkill,
  fileManagerSkill,
  screenshotSkill,
  appLauncherSkill,
  clipboardSkill,
];

export { weatherSkill } from './weather.js';
export { calculatorSkill } from './calculator.js';
export { reminderSkill } from './reminder.js';
export { webSearchSkill } from './web-search.js';
export { browserSkill } from './browser.js';
export { emailSkill } from './email.js';
export { scheduleSkill } from './schedule.js';
export { pipelineSkill } from './pipeline.js';
export { videoGenSkill, musicGenSkill } from './media.js';
export { terminalSkill } from './terminal.js';
export { fileManagerSkill } from './file-manager.js';
export { screenshotSkill } from './screenshot.js';
export { appLauncherSkill } from './app-launcher.js';
export { clipboardSkill } from './clipboard.js';

export default builtinSkills;
