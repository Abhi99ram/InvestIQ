import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development
const globalForPrisma = global;
const prisma = globalForPrisma.prisma || new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

// ── EXPORTS ──────────────────────────────────────────────────────────────────
export async function getUsers() {
  return await prisma.user.findMany({
    orderBy: { createdAt: 'desc' }
  });
}

export async function saveUser(newUser) {
  const existingEmail = await prisma.user.findUnique({ where: { email: newUser.email } });
  if (existingEmail) throw new Error('Email already registered');
  
  if (newUser.mobile) {
    const existingMobile = await prisma.user.findUnique({ where: { mobile: newUser.mobile } });
    if (existingMobile) throw new Error('Mobile number already registered');
  }

  await prisma.user.create({
    data: {
      name: newUser.name || null,
      email: newUser.email,
      password: newUser.password,
      mobile: newUser.mobile || '',
      alerts: newUser.alerts || []
    }
  });
  return true;
}

export async function getUserByEmail(email) {
  if (!email) return null;
  return await prisma.user.findUnique({
    where: { email: email.toLowerCase() }
  });
}

export async function getUserByMobile(mobile) {
  if (!mobile) return null;
  return await prisma.user.findUnique({
    where: { mobile: mobile }
  });
}

export async function updateUserPassword(mobile, newPassword) {
  if (!mobile) throw new Error('Mobile required');
  const user = await prisma.user.update({
    where: { mobile: mobile },
    data: { password: newPassword }
  });
  if (!user) throw new Error('User not found');
  return true;
}

export async function updateUserPasswordByEmail(email, newPassword) {
  if (!email) throw new Error('Email required');
  const user = await prisma.user.update({
    where: { email: email.toLowerCase() },
    data: { password: newPassword }
  });
  if (!user) throw new Error('User not found');
  return true;
}

// ── OTP FUNCTIONS ────────────────────────────────────────────────────────────
export async function saveOtp(identifier, otp, isEmail = false) {
  // Sets an OTP valid for 10 minutes
  const expiry = new Date(Date.now() + 10 * 60 * 1000);
  
  if (isEmail) {
    await prisma.user.update({
      where: { email: identifier.toLowerCase() },
      data: { otp: otp.toString(), otpExpiry: expiry }
    });
  } else {
    await prisma.user.update({
      where: { mobile: identifier },
      data: { otp: otp.toString(), otpExpiry: expiry }
    });
  }
  return true;
}

export async function verifyOtp(identifier, otp, isEmail = false) {
  let user;
  if (isEmail) {
    user = await prisma.user.findUnique({ where: { email: identifier.toLowerCase() } });
  } else {
    user = await prisma.user.findUnique({ where: { mobile: identifier } });
  }

  if (!user) return false;
  if (!user.otp || user.otp !== otp.toString()) return false;
  if (!user.otpExpiry || new Date() > user.otpExpiry) return false;

  // Clear OTP after successful verification
  if (isEmail) {
    await prisma.user.update({ where: { email: identifier.toLowerCase() }, data: { otp: null, otpExpiry: null } });
  } else {
    await prisma.user.update({ where: { mobile: identifier }, data: { otp: null, otpExpiry: null } });
  }
  
  return true;
}
