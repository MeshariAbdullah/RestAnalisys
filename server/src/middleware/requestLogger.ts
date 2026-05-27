import morgan from "morgan";

export const requestLogger = morgan(
  ":method :url :status :res[content-length] - :response-time ms [:req[x-request-id]]",
  {
    skip: (req) => req.url === "/api/health",
  }
);
