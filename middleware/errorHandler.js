module.exports = function errorHandler(err, _req, res, _next) {
  console.error('[ERR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error',
    code: err.code || 'INTERNAL'
  });
};
