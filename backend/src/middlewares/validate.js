/**
 * Middleware de validacion generico basado en esquemas zod.
 * El esquema puede definir "body", "params" y/o "query".
 * Si la validacion falla, delega en errorHandler (ZodError -> 422).
 */
export function validate(schema) {
    return function (req, res, next) {
          const resultado = schema.safeParse({
                  body: req.body,
                  params: req.params,
                  query: req.query
          });

          if (!resultado.success) {
                  return next(resultado.error);
          }

          if (resultado.data.body !== undefined) req.body = resultado.data.body;
          if (resultado.data.params !== undefined) req.params = resultado.data.params;
          if (resultado.data.query !== undefined) req.query = resultado.data.query;

          next();
    };
}

export default validate;
