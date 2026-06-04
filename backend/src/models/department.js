// src/models/Department.js

const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Department extends Model {}

  Department.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
        allowNull: false,
      },

      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: {
            msg: 'Name is required',
          },
        },
      },

      description: {
        type: DataTypes.STRING,
        allowNull: true,
      },

      status: {
        type: DataTypes.ENUM('active', 'inactive'),
        defaultValue: 'active',
      },
    },
    {
      sequelize,
      modelName: 'Department',
      tableName: 'departments',
      timestamps: true,
    }
  );

  return Department;
};
