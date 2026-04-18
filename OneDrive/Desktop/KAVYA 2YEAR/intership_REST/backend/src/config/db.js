const { Sequelize } = require('sequelize');
const path = require('path');

const isProduction = process.env.NODE_ENV === 'production' && process.env.DB_HOST;

const sequelize = isProduction
  ? new Sequelize(
      process.env.DB_NAME || 'taskflow',
      process.env.DB_USER || 'postgres',
      process.env.DB_PASSWORD || 'postgres',
      {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: false,
      }
    )
  : new Sequelize({
      dialect: 'sqlite',
      storage: path.join(__dirname, '../../taskflow.sqlite'),
      logging: process.env.NODE_ENV === 'development' ? console.log : false,
    });

module.exports = sequelize;
