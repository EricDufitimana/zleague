const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
p.players.count().then(n => console.log('Database connection verified. Players:', n))
  .catch(e => { console.error(e.message); process.exitCode = 1; })
  .finally(() => p.$disconnect());
