const { Router } = require('express');

const router = Router();

const { getFlights, postFlight, getSpecificFlight, getIndex} = require('../controllers/flights_controller');
const { postRequest, getRequests, getRequestsByUserId, validateRequestAndUpdateSeats, postOtherRequest, sendWebpayRequest, WebpayReturn, anularTransaccion } = require('../controllers/requests_controller');

router.get('/', getIndex);
router.get('/flights', getFlights);
router.post('/post_flight', postFlight);
router.get('/flights/:id', getSpecificFlight);
// router.get('/arrival_airports', getArrivalAirports);

//Requests
router.post('/post_request', postRequest);
router.get('/requests', getRequests);
router.get('/requests_by_user', getRequestsByUserId);
router.post('/validate_request', validateRequestAndUpdateSeats);
router.post('/post_other_request', postOtherRequest);
router.get('/send_webpay_request', sendWebpayRequest); //CAMBIAR A POST CUANDO YA RECIBA LA INFO
router.all('/webpay-return', WebpayReturn);
router.post('/anular_transaccion', anularTransaccion);
//Quizas hay que agregar endpoint para eliminar o editar requests!

module.exports = router;