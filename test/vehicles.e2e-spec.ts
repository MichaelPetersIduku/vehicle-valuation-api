import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { Connection } from 'typeorm';
import { AppModule } from './../src/app.module';
import { userAdmin } from './utils';
import { RapidApiService } from '../src/common/services/rapid-api.service';

const mockRapidApiService = {
  getVehicleData: async (vin: string) => ({
    vin,
    make: 'Honda',
    model: 'Civic',
    year: 2020,
    mileage_adjustment: 0,
    mileage: 30000,
    trim: 'EX',
    weight: 3000,
    loan_value: 10000,
    adjusted_trade_in_value: 9000,
    average_trade_in: 9500,
  }),
};

describe('Vehicles (e2e)', () => {
  let app: INestApplication;
  let adminJwtToken: string;
  const testVin = '1HGBH41JXMN109186';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RapidApiService)
      .useValue(mockRapidApiService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        transformOptions: { enableImplicitConversion: true },
      }),
    );
    await app.init();

    const connection = app.get(Connection);
    await connection.synchronize(true);

    // seed admin user
    await connection
      .createQueryBuilder()
      .insert()
      .into('users')
      .values([userAdmin])
      .execute();

    // login admin
    const res = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userAdmin.email, password: 'test123' });

    adminJwtToken = res.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  it('ingests vehicle data (admin)', async () => {
    const payload = {
      vin: testVin,
      make: 'Honda',
      model: 'Civic',
      year: '2020',
      mileage: 30000,
      weight: '3000',
      trim: 'EX',
    };

    const response = await request(app.getHttpServer())
      .post('/vehicles/ingest')
      .set('Authorization', `Bearer ${adminJwtToken}`)
      .send(payload)
      .expect(201);

    expect(response.body.vin).toBe(testVin);
    expect(typeof response.body.make).toBe('string');
  });

  it('retrieves vehicle data by vin (public)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/vehicles/${testVin}`)
      .expect(200);

    expect(response.body.vin).toBe(testVin);
    expect(typeof response.body.make).toBe('string');
  });

  it('retrieves vehicle valuation (public)', async () => {
    const response = await request(app.getHttpServer())
      .get(`/vehicles/valuation/${testVin}`)
      .expect(200);

    // Valuation shape may vary by provider; ensure an estimated value or provider exists
    expect(
      response.body.hasOwnProperty('estimatedValue') ||
        response.body.hasOwnProperty('valuation') ||
        response.body.hasOwnProperty('estimated_value'),
    ).toBe(true);
  });
});
