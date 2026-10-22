import cron from 'node-cron';
import { db } from './db.js';
import { sendWeeklyReportEmail } from './resend-service.js';

let schedulerTask = null;
let lastCheckTime = null;
let lastRunResult = null;

// Convert day name to standard English
const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function getCurrentTimeInZone(timeZone) {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone || 'Asia/Kolkata',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });

    const parts = formatter.formatToParts(now);
    const day = parts.find(p => p.type === 'weekday')?.value || dayNames[now.getDay()];
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';

    return {
      day,
      time: `${hour}:${minute}`
    };
  } catch (err) {
    // Fallback if timezone string is invalid
    const now = new Date();
    const day = dayNames[now.getDay()];
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return {
      day,
      time: `${hh}:${mm}`
    };
  }
}

export function initScheduler() {
  if (schedulerTask) {
    schedulerTask.stop();
  }

  console.log('⏰ Weekly report scheduler initialized. Running heartbeat check every minute...');

  // Run every minute to check if schedule criteria match
  schedulerTask = cron.schedule('* * * * *', async () => {
    try {
      lastCheckTime = new Date().toISOString();
      const profile = await db.getProfile();
      if (!profile || !profile.email) {
        return;
      }

      const settings = await db.getReportSettings(profile.email);
      if (!settings || !settings.is_active) {
        return;
      }

      const userZone = settings.timezone || 'Asia/Kolkata';
      const { day, time } = getCurrentTimeInZone(userZone);

      const targetDay = settings.delivery_day || 'Sunday';
      const targetTime = settings.delivery_time || '09:00';

      // Compare day and time
      if (day.toLowerCase() === targetDay.toLowerCase() && time === targetTime) {
        console.log(`🚀 Scheduled delivery time triggered (${day} ${time} in ${userZone}) for ${profile.email}`);
        const result = await sendWeeklyReportEmail({ force: false, targetEmail: profile.email });
        lastRunResult = {
          timestamp: new Date().toISOString(),
          day,
          time,
          result
        };
        console.log('📬 Scheduled report outcome:', result.success ? (result.skipped ? 'Skipped (Duplicate)' : 'Delivered') : 'Failed');
      }
    } catch (err) {
      console.error('⚠️ Error inside scheduled cron check:', err.message);
    }
  });

  return schedulerTask;
}

export function getSchedulerStatus() {
  return {
    is_running: schedulerTask !== null,
    last_check: lastCheckTime,
    last_run_result: lastRunResult,
    system_time: new Date().toISOString()
  };
}
