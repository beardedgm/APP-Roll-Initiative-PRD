import { Resend } from 'resend';
import logger from './logger.js';

let resend = null;

if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
} else {
  logger.warn('RESEND_API_KEY not set — email sending disabled');
}

export default resend;
