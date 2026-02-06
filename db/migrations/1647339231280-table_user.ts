import { MigrationInterface, QueryRunner } from 'typeorm';

export class tableUser1647339231280 implements MigrationInterface {
  name = 'tableUser1647339231280';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasUsers = await queryRunner.hasTable('users');
    if (!hasUsers) {
      await queryRunner.query(
        `CREATE TABLE "users" ("id" integer PRIMARY KEY AUTOINCREMENT NOT NULL, "created_at" datetime NOT NULL DEFAULT (datetime('now')), "updated_at" datetime NOT NULL DEFAULT (datetime('now')), "email" varchar NOT NULL UNIQUE, "password" varchar NOT NULL, "refresh_token" varchar, "first_name" varchar NOT NULL, "last_name" varchar NOT NULL, "role" varchar NOT NULL DEFAULT 'customer')`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasUsers = await queryRunner.hasTable('users');
    if (hasUsers) {
      await queryRunner.query(`DROP TABLE "users"`);
    }
  }
}
