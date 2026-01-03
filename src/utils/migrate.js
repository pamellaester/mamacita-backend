import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function runMigration() {
  try {
    console.log('🔄 Running Prisma migrations...');
    const { stdout, stderr } = await execAsync('npx prisma migrate deploy');
    console.log('✅ Migration output:', stdout);
    if (stderr) {
      console.error('⚠️ Migration stderr:', stderr);
    }
    return { success: true, output: stdout };
  } catch (error) {
    console.error('❌ Migration failed:', error);
    return { success: false, error: error.message };
  }
}

export async function pushSchema() {
  try {
    console.log('🔄 Pushing Prisma schema...');
    const { stdout, stderr } = await execAsync('npx prisma db push --accept-data-loss');
    console.log('✅ Schema push output:', stdout);
    if (stderr) {
      console.error('⚠️ Schema push stderr:', stderr);
    }
    return { success: true, output: stdout };
  } catch (error) {
    console.error('❌ Schema push failed:', error);
    return { success: false, error: error.message };
  }
}
