const errorHandler = (err, req, res, next) => {
  console.error(`[ERROR] ${err.message}`);

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const messages = err.errors.map((e) => e.message);
    return res.status(400).json({ error: 'Validation error', details: messages });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  const status = err.status || 500;
  return res.status(status).json({
    error: err.message || 'Internal server error',
  });
};

module.exports = errorHandler;
