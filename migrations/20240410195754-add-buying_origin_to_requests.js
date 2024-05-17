'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('requests', 'buying_origin', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'Chile'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('requests', 'buying_origin');
  }
};
