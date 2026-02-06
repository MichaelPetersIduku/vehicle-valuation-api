import { MigrationInterface, QueryRunner } from 'typeorm';
import * as bcrypt from 'bcrypt';

export class seedAdminUser1707223200000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Hash the admin password
    const saltRounds = 10;
    const adminPassword = 'Admin@123456';
    const hashedPassword = await bcrypt.hash(adminPassword, saltRounds);

    // Check if admin user already exists
    const existingAdmin = await queryRunner.query(
      `SELECT * FROM "users" WHERE "email" = ?`,
      ['admin@example.com'],
    );

    if (existingAdmin && existingAdmin.length === 0) {
      // Insert admin user only if it doesn't exist
      await queryRunner.query(
        `INSERT INTO "users" ("email", "password", "first_name", "last_name", "role") 
         VALUES (?, ?, ?, ?, ?)`,
        ['admin@example.com', hashedPassword, 'Admin', 'User', 'admin'],
      );

      console.log('Admin user seeded successfully');
      console.log('Email: admin@example.com');
      console.log('Password: Admin@123456');
    } else {
      console.log('dmin user already exists');
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Remove the admin user on rollback
    await queryRunner.query(`DELETE FROM "users" WHERE "email" = ?`, [
      'admin@example.com',
    ]);

    console.log('✓ Admin user removed');
  }
}
