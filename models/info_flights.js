// require('dotenv').config({ path: '../.env' });
const { Sequelize, DataTypes } = require('sequelize');
// postgres_username = process.env.DB_USER;
// postgres_password = process.env.DB_PASSWORD;
// db_name = process.env.DB_NAME;
// console.log(db_name);
// console.log(postgres_username);
// console.log(postgres_password);
// const sequelize = new Sequelize('postgres://${postgres_user}:${postgres_password}@db:5432/${db_name}');
const sequelize = new Sequelize('postgres://valeeramirez:vale123@db:5432/entrega0');

const InfoFlight = sequelize.define('InfoFlight', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    departure_airport_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    departure_airport_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    departure_airport_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    arrival_airport_name: {
        type: DataTypes.STRING,
        allowNull: false
    },
    arrival_airport_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    arrival_airport_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    duration: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    airplane: {
        type: DataTypes.STRING,
        allowNull: false
    },
    airline: {
        type: DataTypes.STRING,
        allowNull: false
    },
    airline_logo: {
        type: DataTypes.STRING,
        allowNull: false
    },
    carbon_emission: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    price: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    currency: {
        type: DataTypes.STRING,
        allowNull: false
    },
    seats_available: { 
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 90
    }
}, {
    tableName: 'info_flights',
    timestamps: true 
});

module.exports = InfoFlight;