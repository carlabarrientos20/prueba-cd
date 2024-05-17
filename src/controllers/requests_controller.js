const Request = require('../../models/requests');
const Flight = require('../../models/info_flights');
const { Op } = require('sequelize');
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');
const jwt = require('jsonwebtoken');
const geoip = require('geoip-lite');
const mqtt = require('mqtt');
const axios = require('axios');
const WebpayPlus = require("transbank-sdk").WebpayPlus;
const { Options, IntegrationApiKeys, Environment, IntegrationCommerceCodes } = require('transbank-sdk');
const Transaction = require('transbank-sdk/dist/es5/transbank/webpay/webpay_plus/transaction');
const { request } = require('express');


// obtiene todas las requests creadas
const getRequests = async (req, res) => {
    try {
        const requests = await Request.findAll();
        res.status(200).json(requests);
    } catch (error) {
        console.error('Error al obtener las solicitudes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//obtiene las requests de un user especifico
const getRequestsByUserId = async (req, res) => {
    try {
        // el id de usuario se obtiene desde el jwt enviado en el header
        /*
        (si bien se podría obtener el user_id de params,
        para asegurar la privacidad se usa la información del token)
        */
        const user_id = getUserId(req);
        const requests = await Request.findAll({
            where: {
                user_id: user_id
            }
        });
        res.status(200).json(requests);
    } catch (error) {
        console.error('Error al obtener las solicitudes:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// con esto creamos una request de nuestra api (es decir un usuario hace una solicitud)
// ademas se manda al mqtt para ser posteado en el canal flights/requests
const postRequest = async (req, res) => {
    const { departure_airport, arrival_airport, departure_time, quantity } = req.body;
    try {
        // Desde front validan que a los vuelos le queden asientos antes de hacer la solicitud
        const user_id = getUserId(req);
        const user_info = await GetUserInfo(user_id);
        const user_name = user_info.name;
        const user_email = user_info.email;
        console.log(user_info);
        console.log(user_name);
        console.log(user_email);
        const request = await Request.create({
            user_id : user_id,
            request_id: uuidv4(),
            group_id: 15,
            departure_airport: departure_airport,
            arrival_airport: arrival_airport,
            departure_time: departure_time,
            datetime: new Date(),
            deposit_token: "",
            quantity: quantity,
            seller: 0,
            buying_origin: getBuyingOrigin(req),
            user_name: user_name,
            user_email: user_email
        });
        const chileTime = moment(departure_time).tz('America/Santiago').format('YYYY-MM-DD HH:mm');
        const messageData = {
            request_id: request.request_id,
            group_id: request.group_id,
            departure_airport: request.departure_airport,
            arrival_airport: request.arrival_airport,
            departure_time: chileTime,
            datetime: request.datetime,
            deposit_token: request.deposit_token,
            quantity: request.quantity,
            seller: request.seller
        };

        //restar los asientos altiro del vuelo para "reservarlos"
        const flight = await Flight.findOne({
            where: {
                arrival_airport_id: request.arrival_airport,
                departure_airport_id: request.departure_airport,
                departure_airport_time: request.departure_time
            }
        });
        if (flight) {
            flight.seats_available = (flight.seats_available - request.quantity); 
            flight.save();
            request.vuelify_flight_id = flight.id;
            request.user_email = user_email;
            request.user_name = user_name;
            request.save();
            // console.log(request);

            sendRequestMessage(messageData); //esto manda la request al brocker
            //Luego de mandarla al canal requests para que todos sepan que se hizo, esta queda pendiente y se manda a webpay
            const response = await sendWebpayRequest(request, messageData);
            console.log(response);
            res.status(201).json(response);
        } else {
            console.log("El vuelo indicado no se encuentra en la DB");
            await request.destroy(); //si no se encuentra el vuelo, se borra la request
            return res.status(201).json('El vuelo indicado no se encuentra en la base de datos');
        };
    } catch (error) {
        console.error('Error al crear la solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

//esta es para guardar la request de otro grupo en nuestra tabla
// con el objetivo de poder validarla si llega al canal validation
const postOtherRequest = async (req, res) => {
    const { request_id, group_id, departure_airport, arrival_airport, departure_time, datetime, deposit_token, quantity, seller } = req.body;
    try {
        const request = await Request.create({
            user_id: null, //se guarda como null porque no viene de un usuario de nuestra api
            request_id: request_id,
            group_id: group_id, //cuando haya que mostrar en front, con el group id se filtran las requests
            departure_airport: departure_airport,
            arrival_airport: arrival_airport,
            departure_time: departure_time,
            datetime: datetime,
            deposit_token: deposit_token,
            quantity: quantity,
            seller: seller
            //hay que hacer algo aqui para poder recibir un ip o algo
            // buying_origin: getBuyingOrigin(req)
        });

        //restar los asientos altiro del vuelo para "reservarlos"
        const flight = await Flight.findOne({
            where: {
                arrival_airport_id: request.arrival_airport,
                departure_airport_id: request.departure_airport,
                departure_airport_time: request.departure_time
            }
        });

        // se maneja el caso en que se reciba una request a un vuelo que no tenemos guardado
        if (flight) {
            flight.seats_available = (flight.seats_available - request.quantity);
            await flight.save();
            request.vuelify_flight_id = flight.id;
            request.save();
            res.status(201).json(request);
        } else {
            console.log("El vuelo indicado no se encuentra en la DB");
            await request.destroy(); //si no se encuentra el vuelo, se borra la request
            return res.status(201).json('El vuelo indicado no se encuentra en la base de datos');
        };
    } catch (error) {
        console.error('Error al crear la solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

// aqui recibimos una request desde el canal flgihts/validation
// si esta validada se marca como true
// si no, se marca como rechazada y se devuelven los asientos al flight
const validateRequestAndUpdateSeats = async (req, res) => {
    const { request_id, group_id, validated} = req.body;
    try {
        const groupIdString = group_id.toString();
        const request = await Request.findOne({
            where: {
                request_id: request_id,
                group_id: groupIdString
            }
        });
        if (request){
            if (validated){
                request.validated = true;
                request.save();
                //ya se restaron los asientos previamente
                res.status(200).json(request);
            } else {  //este es el caso que viene de flights/validation como false
                request.rejected = true;
                request.save();
                const flight = await Flight.findOne({
                    where: {
                        arrival_airport_id: request.arrival_airport,
                        departure_airport_id: request.departure_airport,
                        departure_airport_time: request.departure_time
                    }
                });
                if (flight){
                    flight.seats_available = (flight.seats_available + request.quantity); //se devuelven los asientos ya que fue rechazada
                    flight.save();
                    res.status(200).json(request);
                } else {
                    console.log("El vuelo indicado no se encuentra en la DB");
                    return res.status(201).json('El vuelo indicado no se encuentra en la base de datos');
                }
            }
        } else {
            res.status(201).json('Solicitud no encontrada');
        }
    } catch (error) {
        console.error('Error al validar la solicitud:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
}

// función auxiliar: obtener el jwt enviado en el header
const getUserId = (req) => {
    try {
        const token = req.headers['authorization'].split(' ')[1];
        const decodedToken = jwt.decode(token);
        return decodedToken['sub'];
    } catch (error) {
        console.log(error);
    };
};

// Function to get the buying origin based on IP address
const getBuyingOrigin = (req) => {
    const header = req.headers['x-forwarded-for'];
    const pre_ip = header.split(',')[0].trim();
    const final_ip = pre_ip.slice(1, -1);
    const ip = final_ip || req.connection.remoteAddress;
    const geo = geoip.lookup(ip);
    if (geo) {
        // Construct the buying origin from the available data
        console.log(geo.city, geo.region, geo.country)
        return `${geo.city}, ${geo.region}, ${geo.country}`;
    } else {
        return 'Unknown'; // Default value if IP address cannot be geolocated
    }
};

const sendRequestMessage = (messageData) => {
    // Opciones de conexión MQTT
    const mqttOptions = {
        host: 'broker.iic2173.org',
        port: 9000,
        username: 'students',
        password: 'iic2173-2024-1-students'
    };

    // Conectar al broker MQTT
    const client = mqtt.connect('mqtt://' + mqttOptions.host, mqttOptions);

    // Evento cuando se conecta al broker
    client.on('connect', function () {
        console.log('Conectado al broker MQTT dentro de APP');
        // Publicar el mensaje en requests
        client.publish('flights/requests', JSON.stringify(messageData));
        console.log('Mensaje enviado al broker MQTT');
        client.end();
    });

    // Evento en caso de error de conexión
    client.on('error', function (error) {
        console.error('Error de conexión al broker MQTT:', error);
    });

};

const sendWebpayRequest = async (request, messageData) => {
    console.log('Tamo en webpay');
    if (messageData){
        const request = await Request.findOne({
            where: {
                request_id: messageData.request_id
            }
        });
    } else {
        console.log('No se encontro la request');
        res.status(404).json({ error: 'No se encontro la request' });
    }
    const flight = await Flight.findOne({
        where: {
            arrival_airport_id: request.arrival_airport,
            departure_airport_id: request.departure_airport,
            departure_airport_time: request.departure_time
        }
    });
    if (flight && request){
        console.log('entro con vuelo y request');
        const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
        const buyOrder ='compra-grupo-15';
        const sessionId = request.request_id;
        const amount = flight.price * request.quantity; //precio en total de todos los asientos
        //CAMBIAR A REAL URL
        const returnUrl = 'http://api.e0valeramirez.tech/webpay-return'; //esto hay que ajustarlo con front creo
        const response = await tx.create(buyOrder, sessionId, amount, returnUrl);
        console.log('URL', response.url);
        console.log('token', response.token);
        request.deposit_token = response.token;
        request.save();
        return response;
    } else {
        console.log('No se encontro el vuelo');
        return 'none';
    }
};

const WebpayReturn = async (req, res) => {
    const token = req.method === 'POST' ? req.body.token_ws : req.query.token_ws;
    if (!token) {
        return res.status(400).send('Payment token is missing.');
    }
    const request = await Request.findOne({
        where: {
            deposit_token: token
        }
    });
    try {
        let response;
        const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
        response = await tx.commit(token);
        const flight = await Flight.findOne({
            where: {
                arrival_airport_id: request.arrival_airport,
                departure_airport_id: request.departure_airport,
                departure_airport_time: request.departure_time
            }
        });
        if (response.response_code === 0 && response.status === 'AUTHORIZED') {
            request.validated = true;
            request.save();
            const data = {
                request_id: request.request_id,
                group_id: request.group_id,
                seller: 0,
                valid: true
            };
            //Publish a validation con la request validada
            sendValidationMessage(data);
            console.log('exito');
            //DATOS PARA GATILLAR LAMBDA
            const order = {
                id: response.session_id,
                buy_order: response.buy_order,
                card_detail: response.card_detail,
                precioAsiento: flight.price,
                aeropuertoSalida: flight.departure_airport_id,
                aeropuertoLlegada: flight.arrival_airport_id,
                duracion: flight.duration,
                cantidadAsientos: request.quantity,
                fechaSalida: flight.departure_airport_time,
                fechaLlegada: flight.arrival_airport_time,
                vuelify_flight_id: request.vuelify_flight_id,
                airline: 'airline'
            }
            const lambdaBody = {
                id_usuario: request.user_id,
                nombre: request.user_name,
                email: request.user_email,
                orden: order
            };
            console.log('lambdabody', lambdaBody);

            // Hacer el POST a Lambda
            const lambdaResponse = await axios.post('https://6boyrnlz3e.execute-api.us-east-2.amazonaws.com/dev/generar-boleta', lambdaBody);
            console.log(lambdaResponse.data);
            request.boleta = lambdaResponse.data.url;
            request.save();
        } else {
            request.rejected = true;
            request.validated = false;
            const data = {
                request_id: request.request_id,
                group_id: request.group_id,
                seller: 0,
                valid: false
            };
            request.save();
            //Publish a validation con la request rechazada
            sendValidationMessage(data);
            console.log('fracaso');
        }
        //CAMBIAR A REAL URL
        // res.redirect('https://web.vjimenezs.click/my-purchases');
    } catch (error) {
        console.error('Error processing the Webpay return:', error);
        request.seller = 1; //significa pendiente de pago
        request.save();
        console.log(request);
        // res.redirect('https://web.vjimenezs.click/my-purchases');
    }
    finally {
        console.log('llego a finally');
        res.send(`
            <html>
                <body>
                    <h1> hola </h1>
                </body>
            </html>
        `);
        res.redirect('https://web.vjimenezs.click/my-purchases');
    }
};

const sendValidationMessage = (messageData) => {
    // Opciones de conexión MQTT
    const mqttOptions = {
        host: 'broker.iic2173.org',
        port: 9000,
        username: 'students',
        password: 'iic2173-2024-1-students'
    };

    // Conectar al broker MQTT
    const client = mqtt.connect('mqtt://' + mqttOptions.host, mqttOptions);

    // Evento cuando se conecta al broker
    client.on('connect', function () {
        console.log('Conectado al broker MQTT dentro de APP');
        // Publicar el mensaje en requests
        client.publish('flights/validation', JSON.stringify(messageData));
        console.log('Mensaje enviado al broker MQTT canal Validation');
        client.end();
    });

    // Evento en caso de error de conexión
    client.on('error', function (error) {
        console.error('Error de conexión al broker MQTT:', error);
    });
};

//definir mas detalles de como usar este endpoint
const anularTransaccion = async (req, res) => {
    const token = req.body.token;
    const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
    const amount = 1000;
    const response = await tx.refund(token, amount);
    console.log(response);
    // Esto viene en la response:
    // response.authorization_code
    // response.authorization_date
    // response.balance
    // response.nullified_amount
    // response.response_code
    // response.type
    res.status(200).json(response);
};

const GetUserInfo = async (sub_id) => {
    const api = 'https://dev-436rgvvrn3y8wz3r.us.auth0.com/api/v2';
    const accessToken = "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6IjFkREJiMUFVRlhlMnItNF9vdlhRaiJ9.eyJpc3MiOiJodHRwczovL2Rldi00MzZyZ3Z2cm4zeTh3ejNyLnVzLmF1dGgwLmNvbS8iLCJzdWIiOiJJdTBjVkVsbXpJUTFPbWpTM3lSN08zRmlqaGh6czh4Z0BjbGllbnRzIiwiYXVkIjoiaHR0cHM6Ly9kZXYtNDM2cmd2dnJuM3k4d3ozci51cy5hdXRoMC5jb20vYXBpL3YyLyIsImlhdCI6MTcxNTcyMDU0MiwiZXhwIjoxNzE1ODA2OTQyLCJzY29wZSI6InJlYWQ6dXNlcnMgcmVhZDp1c2Vyc19hcHBfbWV0YWRhdGEiLCJndHkiOiJjbGllbnQtY3JlZGVudGlhbHMiLCJhenAiOiJJdTBjVkVsbXpJUTFPbWpTM3lSN08zRmlqaGh6czh4ZyJ9.UPR4dUkki06tkD22B0oq69hlh3_1Oh8NA7Ox0bF0lS2Xqx1aoDmsngM-xJRTa_bXqVSKMAC29gWmMrRXu_hXOjeuBMbi8mt_60pgozqKtn3pY0051dEFED026MNhp8fMEY-oSDtlsytUT7Ugcri8r-aNDpcJUU91syYkVjb9485PV0p7AN1aiOpLMl6drhO8gJwXU0WA-r7tkdqCnIAxEROFd3KP056jK_7dTizT-bLEVTQyW1TpziFNq3uOnwKNS4LhMUXoyRTIwFvbGOa7gzvfYF6SJTRh04T37ADS-UrBziLQC9TyARS0Rm4Q3eBjBMdsweapth74XYnWoBwO4Q";

    const res = await axios({
        method: 'GET',
        url: `${api}/users/${sub_id}`,
        headers: {
            'Authorization': `Bearer ${accessToken}`
        }
    });
    const data = res.data;

    return { 'name': data.name, 'email': data.email, 'picture': data.picture }
}


//si quisiera obtener el status de una transaccion despues de que paso se peude asi:
// const tx = new WebpayPlus.Transaction(new Options(IntegrationCommerceCodes.WEBPAY_PLUS, IntegrationApiKeys.WEBPAY, Environment.Integration));
// const response = await tx.status(token);

module.exports = {
    postRequest,
    getRequests,
    getRequestsByUserId,
    validateRequestAndUpdateSeats,
    postOtherRequest,
    sendWebpayRequest,
    WebpayReturn,
    anularTransaccion
};


// res.send(`
//     <html>
//         <body>
//             <form id="webpayForm" method="post" action="${response.url}">
//                 <input type="hidden" name="token_ws" value="${response.token}" />
//                 <input type="submit" value="Ir a pagar" />
//             </form>
//             <script>document.getElementById('webpayForm').submit();</script>
//         </body>
//     </html>
// `);