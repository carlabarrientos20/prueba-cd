const InfoFlight = require('../../models/info_flights');
const { Op } = require('sequelize');
// const sequelize = new Sequelize('postgres://valeeramirez:vale123@db:5432/entrega0');

const getIndex = (req, res) => {
    res.status(200).json({ message: 'API de vuelos, ingrese a /flights para más información' });
};

const getFlights = async (req, res) => {
    try {
        // Parámetros de paginación
        const page = req.query.page || 1;
        const count = req.query.count || 25;
        const offset = (page - 1) * count;

        // Parámetros de filtrado
        let filter = {};
        if (req.query.departure) {
            const departure = req.query.departure;
            filter.departure_airport_id = departure;
        }
        if (req.query.arrival) {
            const arrival = req.query.arrival;
            filter.arrival_airport_id = arrival;
        }
        if (req.query.date) {
            const date = req.query.date ? new Date(req.query.date) : new Date();

            // Ajustar la fecha para que solo considere año, mes y día
            const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + 1); // Incrementar un día para obtener el día siguiente

            filter.departure_airport_time = {
                [Op.gte]: startDate, // Mayor o igual al comienzo del día
                [Op.lt]: endDate // Menor que el comienzo del día siguiente
            };
        }

        Object.keys(filter).forEach(key => filter[key] === undefined && delete filter[key]);

        // Consulta a la base de datos
        const flights = await InfoFlight.findAll({
            where: filter,
            limit: count,
            offset: offset
        });

        res.status(200).json(flights);
    } catch (error) {
        console.error('Error al obtener los vuelos:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

const getSpecificFlight = async (req, res) => {
    try {
        const flight = await InfoFlight.findByPk(req.params.id);
        if (flight) {
            res.status(200).json(flight);
        } else {
            res.status(404).json({ error: 'Vuelo no encontrado' });
        }
    } catch (error) {
        console.error('Error al obtener el vuelo:', error);
    }
};

const postFlight = async (req, res) => {
    const { flight, carbon_emissions, price, airline_logo, currency } = req.body;
    const { departure_airport, arrival_airport, duration, airplane, airline } = flight;

    try {
        const newFlight = await InfoFlight.create({
            departure_airport_name: departure_airport.name,
            departure_airport_id: departure_airport.id,
            departure_airport_time: departure_airport.time,
            arrival_airport_name: arrival_airport.name,
            arrival_airport_id: arrival_airport.id,
            arrival_airport_time: arrival_airport.time,
            duration: duration,
            airplane: airplane,
            airline: airline,
            airline_logo: airline_logo,
            carbon_emission: carbon_emissions.this_flight,
            price: price,
            currency: currency
        });

        console.log('Nuevo vuelo creado:', newFlight);
        res.status(201).json(newFlight);
    } catch (error) {
        console.error('Error al crear el vuelo:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};


module.exports = {
    getFlights,
    postFlight,
    getSpecificFlight,
    getIndex
    // getArrivalAirports
};