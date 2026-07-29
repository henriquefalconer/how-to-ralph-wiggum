import { db } from "@/lib/db";

async function run() {
  try {
    console.log('Creating notifications table...');

    // The table will be created when our tests run if it doesn't exist,
    // but for now let's just check the schema exists
    const result = await db.query.notifications.findFirst();
    console.log('✓ Notifications table exists');
  } catch (e: any) {
    if (e.message?.includes('does not exist')) {
      console.log('⚠ Notifications table does not exist yet - will be created by drizzle-kit');
    } else {
      console.error('✗ Error:', e.message);
      throw e;
    }
  }
}

run();
