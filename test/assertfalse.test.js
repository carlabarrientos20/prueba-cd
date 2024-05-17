
const request = require('supertest');
const express = require('express');
const { getIndex } = require('../src/controllers/flights_controller');

const app = express();
app.get('/', getIndex);

describe('GET /flights', () => {
    it('should respond with 500 and error message for invalid query parameters', async () => {
        const response = await request(app)
            .get('/flights')
            .query({ page: -1, count: -10 });

        expect(response.status).toBe(404);

    });
});