import dotenv from 'dotenv';
import { initScheduler } from './scheduler.js';

dotenv.config();

console.log('====================================================');
console.log('⏰ EXPENSE TRACKER - STANDALONE SCHEDULER RUNNER');
console.log('====================================================');

initScheduler();

console.log('Scheduler worker is actively listening for weekly email jobs.');
console.log('Press Ctrl+C to terminate.');

// Keep process active
setInterval(() => {
  // Heartbeat keepalive
}, 60000);
