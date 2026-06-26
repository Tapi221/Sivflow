import { PrismaClient } from '@prisma/client';

export class RefreshUnnamedUser1721299086340 {
  // do the migration
  static async up(db: PrismaClient) {
    const users = await db.user.findMany({
      where: {
        name: 'Unnamed',
      },
      select: {
        id: true,
        email: true,
      },
    });

    await db.$transaction(
      users
        .filter(user => user.email.includes('@'))
        .map(user =>
          db.user.update({
            where: { id: user.id },
            data: {
              name: user.email.split('@')[0] || user.email,
            },
          })
        )
    );
  }

  // revert the migration
  static async down(_db: PrismaClient) {}
}
