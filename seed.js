const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.user.upsert({
    where: { email: 'investiq.helpdesk@gmail.com' },
    update: { password: 'Hint@2002', name: 'InvestIQ Admin', mobile: '0000000000' },
    create: { email: 'investiq.helpdesk@gmail.com', password: 'Hint@2002', name: 'InvestIQ Admin', mobile: '0000000000' }
  });
  await prisma.user.upsert({
    where: { email: 'alapatisubhashchowdary1233@gmail.com' },
    update: { password: 'Hint@2002', name: 'Subhash', mobile: '9059204355' },
    create: { email: 'alapatisubhashchowdary1233@gmail.com', password: 'Hint@2002', name: 'Subhash', mobile: '9059204355' }
  });
  console.log('Admins recreated in Postgres!');
}
main().catch(console.error).finally(() => prisma.$disconnect());
