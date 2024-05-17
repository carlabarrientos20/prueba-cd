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

const Request = sequelize.define('Request', {
    user_id: {
        type: DataTypes.STRING,
        allowNull: true
    },
    request_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    group_id: {
        type: DataTypes.STRING,
        allowNull: false
    },
    departure_airport: {
        type: DataTypes.STRING,
        allowNull: false
    },
    arrival_airport: {
        type: DataTypes.STRING,
        allowNull: false
    },
    departure_time: {
        type: DataTypes.DATE,
        allowNull: false
    },
    datetime: {
        type: DataTypes.DATE,
        allowNull: false
    },
    deposit_token: {
        type: DataTypes.STRING,
        allowNull: false
    },
    quantity: {
        type: DataTypes.INTEGER,
        allowNull: false
    },
    seller: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    validated: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    rejected: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    buying_origin: {
        type: DataTypes.STRING,
        allowNull: true
    },
    vuelify_flight_id: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    user_email: {
        type: DataTypes.STRING,
        allowNull: true
    },
    user_name: {
        type: DataTypes.STRING,
        allowNull: true
    },
    boleta: {
        type: DataTypes.STRING,
        allowNull: true
    }
}, {
    tableName: 'requests', // Nombre de la tabla en la base de datos
    timestamps: true, // Agrega campos 'createdAt' y 'updatedAt' automáticamente
    sequenceName: 'requests_id_seq'
});

module.exports = Request;
