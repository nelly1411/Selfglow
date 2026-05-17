// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const prisma = require("../config/prisma");

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;
const USER_NAME_PATTERN = /^[A-Za-z0-9 _-]+$/;

function getJwtSecret(res) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured");
    res.status(500).json({ message: "Server configuration error" });
    return null;
  }
  return process.env.JWT_SECRET;
}

function toAuthUser(user) {
  return {
    id:           user.id,
    email:        user.email,
    name:         user.name,
    savedAddress: user.savedAddress ?? null,
    savedPostal:  user.savedPostal  ?? null,
    savedCity:    user.savedCity    ?? null,
    savedCountry: user.savedCountry ?? null,
    savedPhone:   user.savedPhone   ?? null,
  };
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidEmail(email) {
  return EMAIL_PATTERN.test(email);
}

function getPasswordValidationMessage(password) {
  if (typeof password !== "string" || password.length < 8) {
    return "Password must be at least 8 characters";
  }

  if (!/[A-Z]/.test(password)) {
    return "Password must contain at least one uppercase letter";
  }

  if (!/[a-z]/.test(password)) {
    return "Password must contain at least one lowercase letter";
  }

  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one number";
  }

  if (!SPECIAL_CHARACTER_PATTERN.test(password)) {
    return "Password must contain at least one special character";
  }

  return null;
}

function getUserNameValidationMessage(name) {
  if (!name) {
    return null;
  }

  if (name.length < 2 || name.length > 30) {
    return "User name must be between 2 and 30 characters";
  }

  if (!USER_NAME_PATTERN.test(name)) {
    return "User name can only contain letters, numbers, spaces, underscores, and hyphens";
  }

  return null;
}

async function register(req, res) {
  try {
    const { email, password, name } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const trimmedName = typeof name === "string" ? name.trim() : "";
    const passwordValidationMessage = getPasswordValidationMessage(password);
    const userNameValidationMessage = getUserNameValidationMessage(trimmedName);

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ message: "Enter a valid email address" });
    }

    if (passwordValidationMessage) {
      return res.status(400).json({ message: passwordValidationMessage });
    }

    if (userNameValidationMessage) {
      return res.status(400).json({ message: userNameValidationMessage });
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        passwordHash: hashedPassword,
        name: trimmedName || null,
      },
    });

    return res.status(201).json({
      message: "User created successfully",
      user: toAuthUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

// ─── Login ─────────────────────────────────────────────────────────────────────
// FIX: select hinzugefügt damit savedAddress-Felder aus DB geladen werden
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !isValidEmail(normalizedEmail) || !password) {
      return res
        .status(400)
        .json({ message: "Email and password are required" });
    }

    // ← FIX: select statt ohne → holt jetzt auch alle savedAddress-Felder
    const user = await prisma.user.findUnique({
      where:  { email: normalizedEmail },
      select: {
        id:           true,
        email:        true,
        name:         true,
        password:     true,
        savedAddress: true,
        savedPostal:  true,
        savedCity:    true,
        savedCountry: true,
        savedPhone:   true,
      },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordIsValid = await bcrypt.compare(password, user.passwordHash);

    if (!passwordIsValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const jwtSecret = getJwtSecret(res);
    if (!jwtSecret) return;

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      },
    );

    return res.json({
      message: "Login successful",
      token,
      user: toAuthUser(user), // ← enthält jetzt savedAddress aus DB
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

// ─── GET /api/auth/address ─────────────────────────────────────────────────────
async function getAddress(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where:  { id: req.user.userId },
      select: {
        savedAddress: true,
        savedPostal:  true,
        savedCity:    true,
        savedCountry: true,
        savedPhone:   true,
      },
    });

    if (!user) return res.status(404).json({ message: "User nicht gefunden" });

    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

// ─── PATCH /api/auth/address ───────────────────────────────────────────────────
// FIX: erwartet jetzt { address, postal, city, country, phone }
// (Checkout schickt diese Feldnamen, nicht savedAddress usw.)
async function updateAddress(req, res) {
  try {
    const userId = req.user.userId;

    // ← FIX: Checkout schickt address/postal/city/country/phone
    const { address, postal, city, country, phone } = req.body;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        savedAddress: address ?? null,
        savedPostal:  postal  ?? null,
        savedCity:    city    ?? null,
        savedCountry: country ?? null,
        savedPhone:   phone   ?? null,
      },
    });

    return res.json({
      message: "Address updated",
      user: toAuthUser(updatedUser),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  register,
  login,
  getAddress,
  updateAddress,
};