// src/models/Ticket.js

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Ticket extends Model {}

  Ticket.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      ticketNumber: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Ticket number is required',
          },
        },
      },

      status: {
        type: DataTypes.ENUM('waiting', 'serving', 'completed', 'cancelled'),
        defaultValue: 'waiting',
      },

      userId: {
        type: DataTypes.UUID,
        allowNull: true,
      },

      departmentId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Ticket',
      tableName: 'tickets',
      timestamps: true,
    }
  );

  return Ticket;
};
