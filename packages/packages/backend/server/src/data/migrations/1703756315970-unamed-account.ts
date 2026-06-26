import { PrismaClient } from '@prisma/client';

const unnamedPattern = /^[\s\u2000-\u200F]*$/;

export class UnamedAccount1703756315970 {
  // do the migration
  static async up(db: PrismaClient) {
    const batchSize = 100;
    let cursor: string | undefined;

    while (true) {
      const users = await db.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
        },
        orderBy: {
          id: 'asc',
        },
        ...(cursor
          ? {
              cursor: { id: cursor },
              skip: 1,
            }
          : {}),
        take: batchSize,
      });

      if (!users.length) {
        break;
      }

      await db.$transaction(
        users
          .filter(user => unnamedPattern.test(user.name))
          .map(user =>
            db.user.update({
              where: { id: user.id },
              data: {
                name: user.email.split('@')[0] || user.email,
              },
            })
          )
      );

      cursor = users.at(-1)?.id;

      if (users.length < batchSize) {
        break;
      }
    }
  }

  // revert the migration
  static async down(_db: PrismaClient) {}
}
