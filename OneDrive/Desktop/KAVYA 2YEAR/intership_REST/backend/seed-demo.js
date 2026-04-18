/**
 * seed-demo.js  – run once to create demo accounts
 * Usage: node seed-demo.js
 */
require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: path.join(__dirname, 'taskflow.sqlite'),
  logging: false,
});

async function seed() {
  await sequelize.authenticate();

  // ── minimal model definitions (mirror only what we need) ──────
  const Organization = sequelize.define('Organization', {
    id:   { type: DataTypes.UUID, primaryKey: true, defaultValue: () => uuidv4() },
    name: { type: DataTypes.STRING, allowNull: false },
    slug: { type: DataTypes.STRING, allowNull: false, unique: true },
  }, { tableName: 'organizations' });

  const User = sequelize.define('User', {
    id:              { type: DataTypes.UUID, primaryKey: true, defaultValue: () => uuidv4() },
    organization_id: { type: DataTypes.UUID },
    name:            { type: DataTypes.STRING, allowNull: false },
    email:           { type: DataTypes.STRING, allowNull: false, unique: true },
    password_hash:   { type: DataTypes.STRING },
    role:            { type: DataTypes.ENUM('admin','member'), defaultValue: 'member' },
    is_active:       { type: DataTypes.BOOLEAN, defaultValue: true },
    avatar:          { type: DataTypes.STRING },
    oauth_provider:  { type: DataTypes.STRING },
    oauth_id:        { type: DataTypes.STRING },
    reset_token:     { type: DataTypes.STRING },
    reset_token_expires: { type: DataTypes.DATE },
    totp_secret:     { type: DataTypes.STRING },
    totp_enabled:    { type: DataTypes.BOOLEAN, defaultValue: false },
    notif_prefs:     { type: DataTypes.TEXT },
  }, { tableName: 'users' });

  // ── check / create org ────────────────────────────────────────
  let org = await Organization.findOne({ where: { slug: 'demo-org' } });
  if (!org) {
    org = await Organization.create({ name: 'Demo Organisation', slug: 'demo-org' });
    console.log('✅ Created organisation:', org.name);
  } else {
    console.log('ℹ️  Organisation already exists:', org.name);
  }

  // ── create / update admin demo ────────────────────────────────
  const adminEmail = 'admin@demo.com';
  const adminHash  = await bcrypt.hash('Admin1234!', 12);
  const [adminUser, adminCreated] = await User.findOrCreate({
    where: { email: adminEmail },
    defaults: {
      organization_id: org.id,
      name: 'Admin Demo',
      password_hash: adminHash,
      role: 'admin',
      is_active: true,
    },
  });
  if (!adminCreated) {
    await adminUser.update({ password_hash: adminHash, organization_id: org.id, role: 'admin', is_active: true });
    console.log('ℹ️  Updated admin user:', adminEmail);
  } else {
    console.log('✅ Created admin user:', adminEmail);
  }

  // ── create / update member demo ───────────────────────────────
  const memberEmail = 'member@demo.com';
  const memberHash  = await bcrypt.hash('Member1234!', 12);
  const [memberUser, memberCreated] = await User.findOrCreate({
    where: { email: memberEmail },
    defaults: {
      organization_id: org.id,
      name: 'Member Demo',
      password_hash: memberHash,
      role: 'member',
      is_active: true,
    },
  });
  if (!memberCreated) {
    await memberUser.update({ password_hash: memberHash, organization_id: org.id, is_active: true });
    console.log('ℹ️  Updated member user:', memberEmail);
  } else {
    console.log('✅ Created member user:', memberEmail);
  }

  console.log('\n🎉 Seed complete!');
  console.log('   Admin  → admin@demo.com   / Admin1234!');
  console.log('   Member → member@demo.com  / Member1234!');
  await sequelize.close();
}

seed().catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); });
