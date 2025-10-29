import jwt from "jsonwebtoken";
import { ENV } from "./env.js";

export const generateToken = (userId, res) => {
  const { JWT_SECRET } = ENV;
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

  const token = jwt.sign({ userId }, JWT_SECRET, {
    expiresIn: "7d",
  });

  res.cookie("jwt", token, {
    maxAge: 7 * 24 * 60 * 60 * 1000, // MS
    httpOnly: true, // prevent XSS attacks: cross-site scripting
    sameSite: "strict", // CSRF attacks
    secure: ENV.NODE_ENV === "development" ? false : true,
  });

  return token;
};

/**
 * Validates a PEM-encoded RSA public key format.
 * 
 * @param {string} publicKeyPem - PEM-encoded public key
 * @returns {boolean} True if valid format
 */
export const validatePublicKeyPem = (publicKeyPem) => {
  if (typeof publicKeyPem !== "string") {
    return false;
  }

  // Check for proper PEM format
  const pemRegex = /^-----BEGIN PUBLIC KEY-----\n[\s\S]+\n-----END PUBLIC KEY-----$/;
  
  if (!pemRegex.test(publicKeyPem.trim())) {
    return false;
  }

  // Ensure it's not a private key
  if (publicKeyPem.includes("PRIVATE KEY")) {
    return false;
  }

  // Basic length check (RSA 2048 public key is ~400-450 chars in PEM)
  if (publicKeyPem.length < 200 || publicKeyPem.length > 2000) {
    return false;
  }

  return true;
};

// http://localhost
// https://dsmakmk.com
