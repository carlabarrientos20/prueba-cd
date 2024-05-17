const mqtt = require('mqtt');
const axios = require('axios');

// Credenciales del broker MQTT
const host = 'broker.iic2173.org';
const port = 9000;
const username = 'students';
const password = 'iic2173-2024-1-students';
const topics = ['flights/info', 'flights/validation', 'flights/requests'];

// Opciones de conexión MQTT
const mqttOptions = {
    host: host,
    port: port,
    username: username,
    password: password
};


const client = mqtt.connect('mgtt://' + host, mqttOptions);
client.on('connect', () => {
    console.log('Connected')
    client.subscribe(topics, () => {
        console.log(`Subscribe to topic '${topics}'`)
    })
})



client.on('message', async function (topic, payload) {
    console.log('TOPIC RECEIVED', topic);
    try {
        if (topic === 'flights/validation') {
            parseData = JSON.parse(payload);
            console.log('LLEGO A VALIDATION:', parseData);
            try {
                const response = await axios.post('http://app:3000/validate_request', {
                    request_id: parseData.request_id,
                    group_id: parseData.group_id,
                    validated: parseData.valid,
                });
                // si fue validada devuelve la requesta aprobada editado, si no devuelve la request rechazada
                console.log('Request validada enviada', response.data);
            } catch (error) {
                console.error('Error al enviar la solicitud de validación:', error);
            }
            return;
        }
        else if (topic === 'flights/requests') {
            parseData = JSON.parse(payload);
            if (parseData.group_id !== '15') {
                //si es de otro grupo, la guardamos en nuestra tabla,
                //así despues cuando se valide podemos editar los vuelos
                try {
                    const response = await axios.post('http://app:3000/post_other_request', {
                        request_id: parseData.request_id,
                        group_id: parseData.group_id,
                        departure_airport: parseData.departure_airport,
                        arrival_airport: parseData.arrival_airport,
                        departure_time: parseData.departure_time,
                        datetime: parseData.datetime,
                        deposit_token: parseData.deposit_token,
                        quantity: parseData.quantity,
                        seller: parseData.seller
                    });
                    console.log('Request ajena guardada con exito', response.data);
                } catch (error) {
                    console.error('Error al guardar la solicitud ajena, formato erroneo:', error);
                }
            }
            return;
        }
        else if (topic === 'flights/info') {
            parseData = JSON.parse(payload);
            const flights = JSON.parse(parseData[0].flights);
            const flight = flights[0];
            const carbon_emissions = JSON.parse(parseData[0].carbonEmission);
            const price = parseData[0].price;
            const airline_logo = parseData[0].airlineLogo;
            const currency = parseData[0].currency;

            const response = await axios.post('http://app:3000/post_flight', {
                flight,
                carbon_emissions,
                price,
                airline_logo,
                currency
            });
            console.log('Data saved to database successfully', response.data);
        }
    } catch (error){
        console.error('Error saving data to database:', error);
    }
});


client.on('error', function (error) {
    console.error('Error connecting to MQTT broker:', error);
});
