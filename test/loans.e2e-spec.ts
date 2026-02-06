import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as request from 'supertest';
import { Connection } from 'typeorm';
import { AppModule } from './../src/app.module';
import { userAdmin, userCustomer } from './utils';

describe('Loans (e2e)', () => {
  jest.setTimeout(20000);
  let app: INestApplication;
  let adminJwtToken: string;
  let customerJwtToken: string;
  let vehicleId: number;
  const testVin = '5FRYD4H66GB592800';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

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

    // seed admin
    await connection
      .createQueryBuilder()
      .insert()
      .into('users')
      .values([userAdmin])
      .execute();

    // login admin
    const adminRes = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userAdmin.email, password: 'test123' });
    adminJwtToken = adminRes.body.accessToken;

    // create customer
    const createCust = await request(app.getHttpServer())
      .post('/users')
      .send(userCustomer)
      .expect(201);

    // login customer
    const custLogin = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: userCustomer.email, password: userCustomer.password })
      .expect(200);

    customerJwtToken = custLogin.body.accessToken;

    // ingest vehicle as admin and capture id
    const v = await request(app.getHttpServer())
      .post('/vehicles/ingest')
      .set('Authorization', `Bearer ${adminJwtToken}`)
      .send({
        vin: testVin,
        make: 'Toyota',
        model: 'Corolla',
        year: '2019',
        mileage: 25000,
        weight: '2800',
        trim: 'LE',
      })
      .expect(201);

    vehicleId = v.body.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('submits loan request and returns loanId', async () => {
    const payload = {
      vehicleId,
      requestedAmount: 15000,
      applicantName: 'Customer Test',
      applicantEmail: userCustomer.email,
      monthlyIncome: 3500,
    };

    const res = await request(app.getHttpServer())
      .post('/loans/apply')
      .set('Authorization', `Bearer ${customerJwtToken}`)
      .send(payload)
      .expect(201);

    expect(res.body).toHaveProperty('loanId');
  });

  it('retrieves user loans for customer', async () => {
    const res = await request(app.getHttpServer())
      .get('/loans')
      .set('Authorization', `Bearer ${customerJwtToken}`)
      .expect(200);

    expect(Array.isArray(res.body.data || res.body)).toBe(true);
  });
});
