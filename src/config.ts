import { registerAs } from '@nestjs/config';

export default registerAs('config', () => {
  return {
    database: {
      type: 'sqlite',
      database: ':memory:',
    },
    jwt: {
      jwtSecret: process.env.JWT_SECRET,
      jwtRefreshSecret: process.env.JWT_REFRESH_SECRET,
      refreshTokenExpiration: process.env.REFRESH_TOKEN_EXPIRATION,
      accessTokenExpiration: process.env.ACCESS_TOKEN_EXPIRATION,
    },
    rapidApi: {
      apiKey: process.env.RAPID_API_KEY,
      baseUrl:
        process.env.RAPID_API_URL || 'https://vin-lookup2.p.rapidapi.com',
    },
  };
});
