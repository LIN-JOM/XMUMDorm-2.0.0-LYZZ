const express = require('express');
const supertest = require('supertest');
const jwt = require('jsonwebtoken');

jest.mock('../../database', () => ({query: jest.fn()}));

const {query} = require('../../database');
const authenticateToken = require('../../middleware/auth');
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function app() {
  const value = express();
  value.get('/protected', authenticateToken, (req, res) => res.json({id: req.user.id}));
  return value;
}

function token(id = 7) {
  return jwt.sign({id, role: 'student'}, JWT_SECRET, {expiresIn: '1h'});
}

beforeEach(() => query.mockReset());

it('allows an active account with a valid token', async () => {
  query.mockResolvedValueOnce([{status: 'active'}]);

  const res = await supertest(app()).get('/protected').set('Authorization', `Bearer ${token()}`);

  expect(res.status).toBe(200);
  expect(res.body).toEqual({id: 7});
  expect(query).toHaveBeenCalledWith('SELECT status FROM users WHERE id = ? LIMIT 1', [7]);
});

it('rejects a deactivated account even when its old token still verifies', async () => {
  query.mockResolvedValueOnce([{status: 'deactivated'}]);

  const res = await supertest(app()).get('/protected').set('Authorization', `Bearer ${token()}`);

  expect(res.status).toBe(403);
  expect(res.body).toMatchObject({status: -1, accountDeactivated: true});
});

it('fails closed when the account row is missing or status lookup fails', async () => {
  query.mockResolvedValueOnce([]);
  const missing = await supertest(app()).get('/protected').set('Authorization', `Bearer ${token()}`);
  expect(missing.status).toBe(403);

  query.mockRejectedValueOnce(new Error('database unavailable'));
  const unavailable = await supertest(app()).get('/protected').set('Authorization', `Bearer ${token()}`);
  expect(unavailable.status).toBe(503);
});
