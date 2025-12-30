export const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || 500;

  console.error('Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method
  });

  res.status(statusCode).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_SERVER_ERROR',
      message: err.message || 'Ocorreu um erro interno no servidor',
      details: process.env.NODE_ENV === 'development' ? err.details : undefined
    }
  });
};
