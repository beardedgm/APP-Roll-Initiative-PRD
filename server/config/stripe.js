import Stripe from 'stripe';
import logger from './logger.js';

let stripe = null;

if (process.env.STRIPE_SECRET_KEY) {
  stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2024-12-18.acacia',
  });
} else {
  logger.warn('STRIPE_SECRET_KEY not set — billing disabled');
}

export default stripe;
