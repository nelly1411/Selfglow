// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const prisma = require("../config/prisma");

const EMAIL_PATTERN            = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;
const USER_NAME_PATTERN        = /^[A-Za-z0-9 _-]+$/;

function getJwtSecret(res) {
  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured");
    res.status(500).json({ message: "Server-Konfigurationsfehler" });
    return null;
  }
  return process.env.JWT_SECRET;
}

function toAuthUser(user) {
  return {
    id:           user.id,
    email:        user.email,
    name:         user.name,
    skinType:     user.skinType     ?? null,
    savedAddress: user.savedAddress ?? null,
    savedPostal:  user.savedPostal  ?? null,
    savedCity:    user.savedCity    ?? null,
    savedCountry: user.savedCountry ?? null,
    savedPhone:   user.savedPhone   ?? null,
    usedWelcomeCode: user.usedWelcomeCode ?? false, 
  };
}

function normalizeEmail(email) {
  return typeof email === "string" ? email.trim().toLowerCase() : "";
}

function isValidEmail(email) {
  return EMAIL_PATTERN.test(email);
}

function getPasswordValidationMessage(password) {
  if (typeof password !== "string" || password.length < 8)
    return "Das Passwort muss mindestens 8 Zeichen lang sein";
  if (!/[A-Z]/.test(password))
    return "Das Passwort muss mindestens einen Großbuchstaben enthalten";
  if (!/[a-z]/.test(password))
    return "Das Passwort muss mindestens einen Kleinbuchstaben enthalten";
  if (!/[0-9]/.test(password))
    return "Das Passwort muss mindestens eine Zahl enthalten";
  if (!SPECIAL_CHARACTER_PATTERN.test(password))
    return "Das Passwort muss mindestens ein Sonderzeichen enthalten";
  return null;
}

function getUserNameValidationMessage(name) {
  if (!name) return null;
  if (name.length < 2 || name.length > 30)
    return "Der Benutzername muss zwischen 2 und 30 Zeichen lang sein";
  if (!USER_NAME_PATTERN.test(name))
    return "Der Benutzername darf nur Buchstaben, Zahlen, Leerzeichen, Unterstriche und Bindestriche enthalten";
  return null;
}

// ─── Register ─────────────────────────────────────────────────────────────────
async function register(req, res) {
  try {
    const { email, password, name } = req.body;
    const normalizedEmail = normalizeEmail(email);
    const trimmedName     = typeof name === "string" ? name.trim() : "";

    const passwordMsg = getPasswordValidationMessage(password);
    const nameMsg     = getUserNameValidationMessage(trimmedName);

    if (!normalizedEmail || !isValidEmail(normalizedEmail))
      return res.status(400).json({ message: "Gib eine gültige E-Mail-Adresse ein" });
    if (passwordMsg)
      return res.status(400).json({ message: passwordMsg });
    if (nameMsg)
      return res.status(400).json({ message: nameMsg });

    const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existingUser)
      return res.status(409).json({ message: "Dieser Benutzer existiert bereits" });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        email:    normalizedEmail,
        password: hashedPassword,   // ← FIX: war passwordHash
        name:     trimmedName || null,
      },
    });

    return res.status(201).json({
      message: "Benutzer erfolgreich erstellt",
      user:    toAuthUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────
async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !isValidEmail(normalizedEmail) || !password)
      return res.status(400).json({ message: "E-Mail und Passwort sind erforderlich" });

    const user = await prisma.user.findUnique({
      where:  { email: normalizedEmail },
      select: {
        id:           true,
        email:        true,
        name:         true,
        password:     true,   // ← FIX: war passwordHash
        skinType:     true,   // ← NEU: skinType mitladen
        savedAddress: true,
        savedPostal:  true,
        savedCity:    true,
        savedCountry: true,
        savedPhone:   true,
        usedWelcomeCode: true,
      },
    });

    if (!user)
      return res.status(401).json({ message: "Ungültige E-Mail-Adresse oder ungültiges Passwort" });

    const passwordIsValid = await bcrypt.compare(password, user.password); // ← FIX: war user.passwordHash

    if (!passwordIsValid)
      return res.status(401).json({ message: "Ungültige E-Mail-Adresse oder ungültiges Passwort" });

    const jwtSecret = getJwtSecret(res);
    if (!jwtSecret) return;

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      jwtSecret,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    return res.json({
      message: "Anmeldung erfolgreich",
      token,
      user: toAuthUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}

// ─── GET /api/auth/address ────────────────────────────────────────────────────
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

    if (!user) return res.status(404).json({ message: "Benutzer nicht gefunden" });
    return res.json(user);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}

// ─── PATCH /api/auth/address ──────────────────────────────────────────────────
async function updateAddress(req, res) {
  try {
    const { address, postal, city, country, phone } = req.body;
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        savedAddress: address ?? null,
        savedPostal:  postal  ?? null,
        savedCity:    city    ?? null,
        savedCountry: country ?? null,
        savedPhone:   phone   ?? null,
      },
    });
    return res.json({ message: "Adresse aktualisiert", user: toAuthUser(updatedUser) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}

// ─── PATCH /api/auth/skin-type ────────────────────────────────────────────────
async function updateSkinType(req, res) {
  try {
    const { skinType } = req.body;
    if (!skinType) return res.status(400).json({ message: "skinType fehlt" });

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data:  { skinType },
    });
    return res.json({ message: "Hauttyp gespeichert", user: toAuthUser(updatedUser) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}

// ─── Email Confirm ────────────────────────────────────────────────────────────
async function confirmEmail(req, res) {
  try {
    const { token } = req.params;
    const jwtSecret = getJwtSecret(res);
    if (!jwtSecret) return;

    const decoded = jwt.verify(token, jwtSecret);
    await prisma.user.update({
      where: { id: decoded.userId },
      data:  { emailVerified: true },
    });
    return res.redirect("http://localhost:5173/login");
  } catch (error) {
    console.error(error);
    return res.status(400).json({ message: "Ungültiger oder abgelaufener Bestätigungslink" });
  }
}
async function deleteSkinType(req, res) {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data:  { skinType: null },
    })
    return res.json({ message: 'Hauttyp gelöscht', user: toAuthUser(updatedUser) })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Serverfehler' })
  }
}
async function checkWelcomeCode(req, res) {
  const user = await prisma.user.findUnique({
    where: { id: req.user.userId },
    select: { usedWelcomeCode: true }
  })
  return res.json({ used: user?.usedWelcomeCode ?? false })
}


module.exports = { register, login, getAddress, updateAddress, updateSkinType, deleteSkinType, checkWelcomeCode, confirmEmail }