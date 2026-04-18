const { Sequelize } = require('sequelize');
const path = require('path');
const db = new Sequelize({ dialect: 'sqlite', storage: path.join(__dirname, 'taskflow.sqlite'), logging: false });
db.query("SELECT name FROM sqlite_master WHERE type='table'")
  .then(([rows]) => { console.log(rows.map(x => x.name).join('\n')); db.close(); })
  .catch(e => { console.error(e.message); process.exit(1); });
