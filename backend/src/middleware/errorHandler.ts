// src/middleware/errorHandler.ts
import { Request, Response, NextFunction } from "express";

interface CustomError extends Error {
  status?: number;
  statusCode?: number;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // If response headers have already been sent, delegate to Express default error handler
  if (res.headersSent) {
    return next(err);
  }

  // Set default error status
  let status = err.status || err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Handle specific error types
  if (err.name === "ValidationError") {
    status = 400;
    message = "Validation Error";
  }

  if (err.name === "UnauthorizedError" || err.name === "JsonWebTokenError") {
    status = 401;
    message = "Unauthorized";
  }

  if (err.name === "CastError") {
    status = 400;
    message = "Invalid ID format";
  }

  // Log error in development
  if (process.env.NODE_ENV === "development") {
    console.error("Error:", {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method,
    });
  }

  // Send error response
  res.status(status).json({
    status: "error",
    message:
      process.env.NODE_ENV === "production"
        ? status === 500
          ? "Something went wrong"
          : message
        : message,
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }),
  });
};

// Custom error classes
export class NotFoundError extends Error {
  status: number;

  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
    this.status = 404;
  }
}

export class ValidationError extends Error {
  status: number;

  constructor(message: string = "Validation failed") {
    super(message);
    this.name = "ValidationError";
    this.status = 400;
  }
}

export class UnauthorizedError extends Error {
  status: number;

  constructor(message: string = "Unauthorized access") {
    super(message);
    this.name = "UnauthorizedError";
    this.status = 401;
  }
}
