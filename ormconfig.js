module.exports = {
  type: 'sqlite',
  database: process.env.NODE_ENV === 'production' ? ':memory:' : 'db.sqlite',
  entities: ['dist/**/entities/*.entity{.ts,.js}'],
  migrations: ['dist/db/migrations/*{.ts,.js}'],
  seeds: ['dist/db/seeds/*.js'],
  factories: ['dist/db/factories/*.js'],
  cli: {
    migrationsDir: 'db/migrations',
  },
  synchronize: true,
};
