// src/utils/helpers.ts
import { randomBytes } from "crypto";

export const generateShareCode = (): string => {
  return randomBytes(4).toString("hex").toUpperCase();
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};
