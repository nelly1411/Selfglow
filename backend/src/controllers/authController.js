const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const prisma = require("../config/prisma");

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
    id: user.id,
    email: user.email,
    name: user.name,
  };
}

async function register(req, res) {
  try {
    const { email, password, name } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
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
        password: hashedPassword,
        name,
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

async function login(req, res) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email?.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const passwordIsValid = await bcrypt.compare(password, user.password);

    if (!passwordIsValid) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    const jwtSecret = getJwtSecret(res);

    if (!jwtSecret) {
      return;
    }

    const token = jwt.sign(
      {
        userId: user.id,
        email: user.email,
      },
      jwtSecret,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1h",
      }
    );

    return res.json({
      message: "Login successful",
      token,
      user: toAuthUser(user),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  register,
  login,
};
