class ErrorHandler extends Error {
  constructor(message, statusCode = 500) {
    super(message);
    this.statusCode = statusCode;
    this.expose = true; // message is written by us and safe to show users
    if (Error.captureStackTrace) Error.captureStackTrace(this, ErrorHandler);
  }
}

const GENERIC = "Unable to complete the request. Please try again.";

// Users only ever see messages we wrote ourselves. Everything else is logged
// on the server and replaced with a generic message (no stack traces, no DB errors).
export const errorMiddleware = (err, req, res, next) => {
  if (err instanceof ErrorHandler) return res.status(err.statusCode || 500).json({ success: false, message: err.message });

  if (err.name === "ValidationError" && err.errors) {
    const msg = Object.values(err.errors).map((e) => e.message).join(" ");
    return res.status(400).json({ success: false, message: msg });
  }
  if (err.name === "CastError") return res.status(400).json({ success: false, message: "Invalid request." });
  if (err.code === 11000) return res.status(409).json({ success: false, message: "This record already exists." });
  if (err.type === "entity.parse.failed") return res.status(400).json({ success: false, message: "Malformed request." });

  console.error("[error]", req.method, req.originalUrl, err);
  return res.status(500).json({ success: false, message: GENERIC });
};

export default ErrorHandler;
