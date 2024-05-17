'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('info_flights', 'seats_available', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 90
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('info_flights', 'seats_available');
  }
};
