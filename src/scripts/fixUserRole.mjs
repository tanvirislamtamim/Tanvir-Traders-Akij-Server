/**
 * fixUserRole.mjs
 * MongoDB-তে user এর role সরাসরি update করার script
 * 
 * Usage:
 *   node src/scripts/fixUserRole.mjs list                        → সব users দেখুন
 *   node src/scripts/fixUserRole.mjs set <email> <role>          → role পরিবর্তন করুন
 *
 * Example:
 *   node src/scripts/fixUserRole.mjs set chalala@gmail.com developer
 */

import { MongoClient } from 'mongodb';

const MONGODB_URI = 'mongodb+srv://tanvir-traders-akij:4SZNe22C9pwdQpa3@cluster0.yizffch.mongodb.net/tanvir_traders_akij?retryWrites=true&w=majority&appName=Cluster0';
const DB_NAME     = 'tanvir_traders_akij';
const COLLECTION  = 'appusers';
const VALID_ROLES = ['developer', 'dealer', 'admin', 'user'];

const COLORS = {
  reset:   '\x1b[0m',
  bold:    '\x1b[1m',
  green:   '\x1b[32m',
  red:     '\x1b[31m',
  yellow:  '\x1b[33m',
  cyan:    '\x1b[36m',
  gray:    '\x1b[90m',
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

async function main() {
  const [,, command, ...args] = process.argv;

  if (!command || command === 'help') {
    console.log(`
📋 fixUserRole.mjs — User Role Management

Commands:
  list                          → সব users দেখুন
  set <email> <role>            → নির্দিষ্ট user এর role পরিবর্তন

Valid Roles: developer | dealer | admin | user

Examples:
  node src/scripts/fixUserRole.mjs list
  node src/scripts/fixUserRole.mjs set chalala@gmail.com developer
`);
    return;
  }

  const client = new MongoClient(MONGODB_URI);
  try {
    console.log('⏳ MongoDB তে সংযোগ হচ্ছে...');
    await client.connect();
    const db   = client.db(DB_NAME);
    const col  = db.collection(COLLECTION);
    console.log('✅ সংযোগ সফল!\n');

    // ─── LIST ────────────────────────────────────────────────────────────────
    if (command === 'list') {
      const users = await col.find({}).sort({ createdAt: -1 }).toArray();
      if (users.length === 0) {
        console.log('কোনো user পাওয়া যায়নি।');
        return;
      }

      console.log(`👥 মোট ${users.length} জন User:\n`);

      const roleEmoji = { developer: '🟣', dealer: '🔵', admin: '🟠', user: '🟢' };

      users.forEach((u, i) => {
        const emoji = roleEmoji[u.role] || '⚪';
        const role  = (u.role || 'N/A').padEnd(10);
        console.log(
          `  ${String(i + 1).padStart(2)}. ` +
          `${emoji} ${(u.email || '').padEnd(40)} ` +
          `[${role}] ` +
          `${u.displayName || '(নাম নেই)'}`
        );
      });

      const noRole = users.filter(u => !u.role || !VALID_ROLES.includes(u.role));
      if (noRole.length > 0) {
        console.log(`\n⚠️  ${noRole.length} জন user এর role নেই বা invalid:`);
        noRole.forEach(u => console.log(`   - ${u.email}`));
      }
      return;
    }

    // ─── SET ─────────────────────────────────────────────────────────────────
    if (command === 'set') {
      const [email, role] = args;

      if (!email || !role) {
        console.error('❌ Usage: node src/scripts/fixUserRole.mjs set <email> <role>');
        process.exit(1);
      }

      if (!VALID_ROLES.includes(role)) {
        console.error(`❌ Invalid role: "${role}"`);
        console.error(`   Valid roles: ${VALID_ROLES.join(', ')}`);
        process.exit(1);
      }

      const emailLower = email.toLowerCase().trim();
      const user = await col.findOne({ email: emailLower });

      if (!user) {
        console.error(`❌ "${emailLower}" email দিয়ে কোনো user পাওয়া যায়নি।`);
        console.log('💡 সব users দেখতে: node src/scripts/fixUserRole.mjs list');
        process.exit(1);
      }

      console.log(`📌 পাওয়া গেছে: ${user.email} (বর্তমান role: ${user.role || 'N/A'})`);

      if (user.role === role) {
        console.log(`ℹ️  এই user এর role ইতিমধ্যে "${role}" আছে। কোনো পরিবর্তন করা হয়নি।`);
        return;
      }

      const result = await col.updateOne(
        { _id: user._id },
        { $set: { role } }
      );

      if (result.modifiedCount === 1) {
        console.log(`\n✅ সফল! "${user.email}" এর role পরিবর্তন হয়েছে:`);
        console.log(`   ${user.role || 'N/A'}  →  ${role}`);
        console.log('\n💡 পরের বার login করলে নতুন role কাজ করবে।');
      } else {
        console.error('❌ Update ব্যর্থ হয়েছে। আবার চেষ্টা করুন।');
      }
      return;
    }

    console.error(`❌ অজানা command: "${command}"`);
    console.log('   help দেখতে: node src/scripts/fixUserRole.mjs help');

  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 সংযোগ বন্ধ করা হয়েছে।');
  }
}

main();
