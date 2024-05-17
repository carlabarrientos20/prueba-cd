
const request = require('supertest');
const express = require('express');
const { getIndex } = require('../src/controllers/flights_controller');

const app = express();
app.get('/', getIndex);

describe('GET //flights/:id', () => {
    it('should respond with 500 and error message for invalid query parameters', async () => {
        const response = await request(app)
            .get('/getSpecificFlight')
            .query({ id:-1 });

        expect(response.status).toBe(404);

    });
});