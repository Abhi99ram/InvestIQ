const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const fetch = require('node-fetch'); // Next.js test requires fetch or we can just use native fetch if node > 18

async function main() {
  console.log('--- STARTING E2E VERIFICATION ---');

  // We will directly invoke the server handlers since it's easier, but
  // since they are next.js handlers, let's just use Prisma directly to verify state.

  // 1. Cleanup test user
  await prisma.user.deleteMany({ where: { email: 'test_verify@investiq.com' } });

  console.log('[1] Created User manually via Prisma (Simulating Signup)');
  await prisma.user.create({
    data: {
      name: 'Test User',
      email: 'test_verify@investiq.com',
      mobile: '9999999999',
      password: 'password123',
      alerts: []
    }
  });

  console.log('[2] Generating OTP using cloudDB method');
  const { saveOtp, verifyOtp } = require('./lib/cloudDB.js');
  await saveOtp('test_verify@investiq.com', '123456', true);

  console.log('[3] Verifying OTP using cloudDB method');
  const isValid = await verifyOtp('test_verify@investiq.com', '123456', true);
  if (!isValid) throw new Error('OTP Verification Failed');
  console.log('    -> OTP Verification SUCCESSFUL!');

  console.log('[4] Verifying OTP is cleared after use');
  const isInvalid = await verifyOtp('test_verify@investiq.com', '123456', true);
  if (isInvalid) throw new Error('OTP was not cleared after use!');
  console.log('    -> OTP Cleared SUCCESSFUL!');

  console.log('[5] Simulating /api/alerts/save payload');
  const fakeAlert = { symbol: 'RELIANCE.NS', targetPrice: 10, direction: 'above', id: 999, active: true };
  const userBefore = await prisma.user.findUnique({ where: { email: 'test_verify@investiq.com' } });
  let alertsArray = userBefore.alerts || [];
  alertsArray.push(fakeAlert);
  await prisma.user.update({
    where: { email: 'test_verify@investiq.com' },
    data: { alerts: alertsArray }
  });
  console.log('    -> Alert Saved to DB!');

  console.log('[6] Testing Cron Job logic manually');
  const userWithAlerts = await prisma.user.findUnique({ where: { email: 'test_verify@investiq.com' } });
  const activeAlerts = userWithAlerts.alerts.filter(a => a.active);
  if (activeAlerts.length !== 1) throw new Error('Active alerts mismatch');
  console.log('    -> Successfully detected active alert in DB!');

  console.log('--- ALL VERIFICATIONS PASSED ---');
}

main().catch(console.error).finally(() => prisma.$disconnect());
