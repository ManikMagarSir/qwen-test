const request = require('supertest');
const express = require('express');
const errorHandler = require('../middleware/errorHandler');

const app = express();
app.use(express.json());

app.get('/test-error', (req, res, next) => {
  const err = new Error('Test error');
  err.status = 400;
  next(err);
});

app.get('/test-server-error', (req, res, next) => {
  next(new Error('Internal failure'));
});

app.use(errorHandler);

describe('Error Handler Middleware', () => {
  it('should return 400 for client errors', async () => {
    const res = await request(app).get('/test-error');
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('error', 'Test error');
  });

  it('should return 500 for server errors', async () => {
    const res = await request(app).get('/test-server-error');
    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
});
