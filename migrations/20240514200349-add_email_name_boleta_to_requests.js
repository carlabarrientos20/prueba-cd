'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('requests', 'user_email', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('requests', 'user_name', {
      type: Sequelize.STRING,
      allowNull: true
    });
    await queryInterface.addColumn('requests', 'boleta', {
      type: Sequelize.STRING,
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('requests', 'user_email');
    await queryInterface.removeColumn('requests', 'user_name');
    await queryInterface.removeColumn('requests', 'boleta');
  }
};
