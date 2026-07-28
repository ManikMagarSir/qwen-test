const request = require('supertest');
const express = require('express');
const authRoutes = require('../routes/auth');
const profileRoutes = require('../routes/profile');
const { validate } = require('../utils/validate');
const errorHandler = require('../middleware/errorHandler');

// Mock User model
jest.mock('../models/User', () => {
  const mockUser = {
    _id: '507f1f77bcf86cd799439011',
    email: 'test@example.com',
    name: 'Test User',
    role: 'user',
    password: '$2a$12$LJ3m4ys3Lk0TSwHn9Ykf0Oq5G5X5X5X5X5X5X5X5X5X5X5X5X5',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    comparePassword: jest.fn().mockResolvedValue(true),
    save: jest.fn().mockResolvedValue(true),
    toJSON: function () {
      const obj = { ...this };
      delete obj.password;
      return obj;
    },
  };

  const User = jest.fn().mockImplementation(() => mockUser);
  User.findOne = jest.fn().mockResolvedValue(null);
  User.findById = jest.fn().mockResolvedValue(mockUser);
  User.create = jest.fn().mockResolvedValue(mockUser);

  return User;
});

const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'new@test.com', password: 'password123', name: 'New User' });

      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
    });

    it('should reject missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com' });

      expect(res.status).toBe(400);
    });

    it('should reject invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'notanemail', password: 'password123', name: 'Test' });

      expect(res.status).toBe(400);
    });

    it('should reject short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ email: 'test@test.com', password: '123', name: 'Test' });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login with valid credentials', async () => {
      const User = require('../models/User');
      User.findOne.mockResolvedValue({
        _id: '507f1f77bcf86cd799439011',
        email: 'test@example.com',
        name: 'Test User',
        role: 'user',
        comparePassword: jest.fn().mockResolvedValue(true),
        toJSON: function () {
          return { _id: this._id, email: this.email, name: this.name, role: this.role };
        },
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'password123' });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should reject invalid password', async () => {
      const User = require('../models/User');
      User.findOne.mockResolvedValue({
        comparePassword: jest.fn().mockResolvedValue(false),
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpass' });

      expect(res.status).toBe(401);
    });
  });
});

describe('Validate Utils', () => {
  it('should validate register schema', () => {
    const { schemas } = require('../utils/validate');
    const { error } = schemas.register.validate({
      email: 'test@test.com',
      password: 'password123',
      name: 'Test',
    });
    expect(error).toBeUndefined();
  });

  it('should reject register with short password', () => {
    const { schemas } = require('../utils/validate');
    const { error } = schemas.register.validate({
      email: 'test@test.com',
      password: '123',
      name: 'Test',
    });
    expect(error).toBeDefined();
  });

  it('should validate create instance schema', () => {
    const { schemas } = require('../utils/validate');
    const { error } = schemas.createInstance.validate({
      type: 'lxc',
      name: 'my-container',
      ostemplate: 'local:vztmpl/ubuntu-22.04-standard_22.04-1_amd64.tar.zst',
    });
    expect(error).toBeUndefined();
  });

  it('should reject invalid instance name', () => {
    const { schemas } = require('../utils/validate');
    const { error } = schemas.createInstance.validate({
      type: 'lxc',
      name: 'invalid name with spaces!',
      ostemplate: 'test',
    });
    expect(error).toBeDefined();
  });
});
