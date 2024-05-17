const request = require('supertest');
const express = require('express');
const { getIndex } = require('../src/controllers/flights_controller');

const app = express();
app.get('/', getIndex);

describe('GET /', () => {
  it('debe devolver un mensaje con la información de la API', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.body).toEqual({
      message: 'API de vuelos, ingrese a /flights para más información',
    });
  });
});
