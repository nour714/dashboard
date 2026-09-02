/**
 * AfricaTravel - Admin & Employee Password Rotation Utility
 *
 * Usage:
 *   node scripts/reset-admin-passwords.js
 *   node scripts/reset-admin-passwords.js --new-password="YourStrongPassword2026!"
 */

import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function generateSecurePassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%^&*';
  const bytes = crypto.randomBytes(16);
  let password = '';
  for (let i = 0; i < 16; i++) {
    password += chars[bytes[i] % chars.length];
  }
  return password;
}

async function main() {
  console.log('🔒 ========================================================');
  console.log('   AfricaTravel User Password Rotation Utility');
  console.log('========================================================\n');

  const args = process.argv.slice(2);
  const customPasswordArg = args.find(a => a.startsWith('--new-password='));
  const targetEmailArg = args.find(a => a.startsWith('--email='));

  const fixedPassword = customPasswordArg ? customPasswordArg.split('=')[1] : null;
  const targetEmail = targetEmailArg ? targetEmailArg.split('=')[1].toLowerCase().trim() : null;

  if (fixedPassword && fixedPassword.length < 8) {
    console.error('❌ Password must be at least 8 characters long.');
    process.exit(1);
  }

  const where = targetEmail ? { email: targetEmail } : {};
  const users = await prisma.user.findMany({ where, orderBy: { role: 'asc' } });

  if (users.length === 0) {
    console.log(`⚠️ No users found matching filter.`);
    return;
  }

  console.log(`Found ${users.length} user(s). Updating passwords with bcrypt cost factor 12...\n`);

  for (const user of users) {
    const newPlainPassword = fixedPassword || generateSecurePassword();
    const newHash = await bcrypt.hash(newPlainPassword, 12);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: newHash,
        lastActive: new Date()
      }
    });

    // Revoke all existing sessions
    await prisma.refreshToken.updateMany({
      where: { userId: user.id },
      data: { revoked: true }
    });

    console.log(`✅ [${user.role}] ${user.name} (${user.email}):`);
    console.log(`   New Password: ${newPlainPassword}\n`);
  }

  console.log('✨ All passwords successfully rotated and active sessions revoked.');
  console.log('⚠️ Please save the new credentials in your password manager immediately.');
}

main()
  .catch(err => {
    console.error('❌ Error rotating passwords:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
