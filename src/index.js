const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());

const InfoFlights = require('../models/info_flights');

const Requests = require('../models/requests')

const port = process.env.PORT;

async function synchronize() {
  try {
    await InfoFlights.sync({ force: false });
    console.log('Modelo infoflights sincronizado con la base de datos.');
    await Requests.sync({force: false});
    console.log('Modelo requests sincronizado con la base de datos.');
  } catch (error) {
    console.error('Error al sincronizar modelo con la base de datos:', error);
  }
}

synchronize();


//middlewares

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//routes
app.use('/', require('./routes/index'));

app.listen(port, () => {
  console.log('Server is running on port', port);
});