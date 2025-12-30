export const notFound = (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Rota não encontrada: ${req.method} ${req.path}`,
      suggestion: 'Verifique a documentação da API em /api/v1/docs'
    }
  });
};
