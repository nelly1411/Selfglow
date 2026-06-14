// controllers/authController.js
const bcrypt = require("bcrypt");
const jwt    = require("jsonwebtoken");
const prisma = require("../config/prisma");
const { sendEmailConfirmation } = require("../services/mail.service");

const EMAIL_PATTERN            = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SPECIAL_CHARACTER_PATTERN = /[^A-Za-z0-9]/;
const USER_NAME_PATTERN        = /^[A-Za-z0-9 _-]+$/;

const REQUIRE_EMAIL_VERIFICATION =
  process.env.REQUIRE_EMAIL_VERIFICATION === "true";

const { refreshUserProfileEmbedding } = require("../services/user-profile-embedding.service");

const SKIN_TYPES = new Set(["Normal", "Oily", "Dry", "Combination", "Sensitive"]);
const EDITABLE_SKIN_FACT_KEYS = [
  "concern",
  "skin_state",
  "sensitivity",
  "ingredient_avoidance",
  "allergy",
  "goal",
  "preference",
];
const PROFILE_FACT_REPLACE_KEYS = [...EDITABLE_SKIN_FACT_KEYS, "skin_type"];

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
    emailVerified: user.emailVerified ?? false,
    gender: user.gender ?? null,
  };
}

function getBackendUrl(req) {
  return (
    process.env.BACKEND_URL ||
    `${req.protocol}://${req.get("host")}`
  ).replace(/\/$/, "");
}

function getFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
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

function cleanFactValue(value) {
  if (typeof value !== "string") return null;
  const cleaned = value.trim().slice(0, 80);
  return cleaned || null;
}

function mapSkinProfileResponse(user, facts) {
  return {
    skinType: user.skinType,
    gender: user.gender,
    facts: facts.map((fact) => ({
      key: fact.key,
      value: fact.value,
      confidence: fact.confidence,
      source: fact.source,
      updatedAt: fact.updatedAt,
    })),
  };
}

// ─── Register ─────────────────────────────────────────────────────────────────
async function register(req, res) {
  try {
    const { email, password, name, gender } = req.body;
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

    //6-stelligen Verifikationscode
    const verificationCode = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    const verificationCodeExpiry = new Date(Date.now() + 15 * 60 * 1000);

    const user = await prisma.user.create({
      data: {
        email:    normalizedEmail,
        password: hashedPassword,   // ← FIX: war passwordHash
        name:     trimmedName || null,
        gender:   gender || null, 
        emailVerified: false,
        verificationCode,
        verificationCodeExpiry,
      },
    });

    try {
      await sendEmailConfirmation({
        to: user.email,
        name: user.name,
        code: verificationCode,
      });
    } catch (mailError){
      await prisma.user.delete({
        where: { id: user.id },
      });

      console.error("Failed to send confirmation mail: ", mailError);

      return res.status(500).json({
        message: "Konto konnte nicht erstellt werden, weil die bestätigungsmail nicht gesendet werden konnte",
      });
    }

    return res.status(201).json({
      message: "Konto erstellt. Bitte gib den 6-stelligen Code aus deiner E-Mail ein.",
      email: normalizedEmail,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Serverfehler"
    });
  }
}

//___ Verify Code
async function verifyCode(req, res){
  try {
    const {email, code} = req.body;
    const normalizedEmail = normalizeEmail(email);

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    });

    if (!user)
      return res.status(404).json({
    message: "Benutzer nicht gefunden"});

    if (user.emailVerified) 
      return res.status(400).json({
    message: "E-Mail bereits bestätigt"});

    if (!user.verificationCode || !user.verificationCodeExpiry)
      return res.status(400).json({
    message: "Kein Code vorhanden"});

    if (new Date() > user.verificationCodeExpiry)
      return res.status(400).json({
    message: "Code abgelaufen. Bitte erneut registrieren."});

    if (user.verificationCode !== code) 
      return res.status(400).json({
    message: "Falscher Code"});

    await prisma.user.update({
      where: {id: user.id},
      data: {
        emailVerified: true,
        verificationCode: null,
        verificationCodeExpiry: null
      },
    });

    return res.json({
      message: "E-Mail erfolgreich bestätigt. Du kannst dich jetzt anmelden."
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Serverfehler"
    });
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
        emailVerified: true,
         gender:       true, 
      },
    });

    if (!user)
      return res.status(401).json({ message: "Ungültige E-Mail-Adresse oder ungültiges Passwort" });

    const passwordIsValid = await bcrypt.compare(password, user.password); // ← FIX: war user.passwordHash

    if (!passwordIsValid)
      return res.status(401).json({ message: "Ungültige E-Mail-Adresse oder ungültiges Passwort" });

    /*if (!user.emailVerified)
      return res.status(403).json({ message: "Bitte bestätige zuerst deine E-Mail-Adresse" });
    */
    if (REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
      return res.status(403).json({
        message: "Bitte bestätige zuerst deine E-Mail-Adresse",
      });
    }
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

async function getProfileContext(req, res) {
  try {
    const userId = req.user.userId;

    const [user, facts, latestAnalysis, latestImageConversation, analysisImages, chatImageConversations, cart, wishlist] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: {
          id: true,
          skinType: true,
          gender: true,
        },
      }),
      prisma.userSkinProfileFact.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
      prisma.skinAnalysis.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          skinType: true,
          dryness: true,
          redness: true,
          blemishes: true,
          sensitivity: true,
          overall: true,
          imageData: true,
          createdAt: true,
        },
      }),
      prisma.conversation.findFirst({
        where: {
          userId,
          messages: {
            some: {
              imageData: { not: null },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        include: {
          messages: {
            where: {
              imageData: { not: null },
            },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              imageData: true,
              content: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.skinAnalysis.findMany({
        where: {
          userId,
          imageData: { not: null },
        },
        orderBy: { createdAt: "desc" },
        take: 12,
        select: {
          id: true,
          imageData: true,
          createdAt: true,
        },
      }),
      prisma.conversation.findMany({
        where: {
          userId,
          messages: {
            some: {
              imageData: { not: null },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 12,
        include: {
          messages: {
            where: {
              imageData: { not: null },
            },
            orderBy: { createdAt: "desc" },
            take: 3,
            select: {
              id: true,
              imageData: true,
              content: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.cart.findUnique({
        where: { userId },
        include: {
          items: {
            take: 5,
            orderBy: { updatedAt: "desc" },
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  brand: true,
                  category: true,
                },
              },
            },
          },
        },
      }),
      prisma.wishlistItem.findMany({
        where: { userId },
        take: 5,
        orderBy: { createdAt: "desc" },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              brand: true,
              category: true,
            },
          },
        },
      }),
    ]);

    if (!user) {
      return res.status(404).json({ message: "Benutzer nicht gefunden" });
    }

    const latestChatImage = latestImageConversation?.messages?.[0] || null;
    const latestProfileImage =
      latestAnalysis?.imageData && (!latestChatImage || latestAnalysis.createdAt >= latestImageConversation.updatedAt)
        ? {
            imageData: latestAnalysis.imageData,
            source: "skin_analysis",
            createdAt: latestAnalysis.createdAt,
          }
        : latestChatImage?.imageData
          ? {
              imageData: latestChatImage.imageData,
              source: "chat",
              createdAt: latestImageConversation.updatedAt,
            }
          : null;

    const profileImages = [
      ...analysisImages
        .filter((image) => image.imageData)
        .map((image) => ({
          id: `skin_analysis-${image.id}`,
          imageData: image.imageData,
          source: "skin_analysis",
          createdAt: image.createdAt,
        })),
      ...chatImageConversations.flatMap((conversation) =>
        conversation.messages
          .filter((message) => message.imageData)
          .map((message) => ({
            id: `chat-${message.id}`,
            imageData: message.imageData,
            source: "chat",
            createdAt: conversation.updatedAt,
          }))
      ),
    ]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .filter((image, index, all) => all.findIndex((item) => item.imageData === image.imageData) === index)
      .slice(0, 12);

    return res.json({
      ...mapSkinProfileResponse(user, facts),
      latestAnalysis,
      latestProfileImage,
      profileImages,
      cart: (cart?.items || []).map((item) => ({
        id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        category: item.product.category,
        quantity: item.quantity,
      })),
      wishlist: wishlist.map((item) => ({
        id: item.product.id,
        name: item.product.name,
        brand: item.product.brand,
        category: item.product.category,
      })),
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}

async function updateSkinProfile(req, res) {
  try {
    const userId = req.user.userId;
    const { skinType, facts = {} } = req.body;
    const normalizedSkinType = skinType === null || skinType === "" ? null : skinType;

    if (normalizedSkinType && !SKIN_TYPES.has(normalizedSkinType)) {
      return res.status(400).json({ message: "Ungültiger Hauttyp" });
    }

    const nextFacts = [];
    if (normalizedSkinType) {
      nextFacts.push({
        userId,
        key: "skin_type",
        value: normalizedSkinType,
        source: "profile",
        confidence: 0.9,
        evidence: "Vom Nutzer im Profil gepflegt",
      });
    }

    for (const key of EDITABLE_SKIN_FACT_KEYS) {
      const values = Array.isArray(facts[key]) ? facts[key] : [];
      for (const value of values) {
        const cleaned = cleanFactValue(value);
        if (!cleaned) continue;
        if (nextFacts.some((fact) => fact.key === key && fact.value === cleaned)) continue;
        nextFacts.push({
          userId,
          key,
          value: cleaned,
          source: "profile",
          confidence: 0.9,
          evidence: "Vom Nutzer im Profil gepflegt",
        });
      }
    }

    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: userId },
        data: { skinType: normalizedSkinType },
      });

      await tx.userSkinProfileFact.deleteMany({
        where: {
          userId,
          key: { in: PROFILE_FACT_REPLACE_KEYS },
        },
      });

      if (nextFacts.length > 0) {
        await tx.userSkinProfileFact.createMany({
          data: nextFacts,
          skipDuplicates: true,
        });
      }
    });

    await refreshUserProfileEmbedding(userId);

    const [user, savedFacts] = await Promise.all([
      prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, skinType: true, savedAddress: true, savedPostal: true, savedCity: true, savedCountry: true, savedPhone: true, usedWelcomeCode: true, emailVerified: true, gender: true },
      }),
      prisma.userSkinProfileFact.findMany({
        where: { userId },
        orderBy: { updatedAt: "desc" },
        take: 30,
      }),
    ]);

    return res.json({
      message: "Hautprofil gespeichert",
      user: toAuthUser(user),
      profile: mapSkinProfileResponse(user, savedFacts),
    });
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
    if (!SKIN_TYPES.has(skinType)) return res.status(400).json({ message: "Ungültiger Hauttyp" });

    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: req.user.userId },
        data:  { skinType },
      });

      await tx.userSkinProfileFact.deleteMany({
        where: {
          userId: req.user.userId,
          key: "skin_type",
        },
      });

      await tx.userSkinProfileFact.create({
        data: {
          userId: req.user.userId,
          key: "skin_type",
          value: skinType,
          source: "profile",
          confidence: 0.9,
          evidence: "Vom Nutzer im Profil gepflegt",
        },
      });

      return user;
    });

    await refreshUserProfileEmbedding(req.user.userId);
    return res.json({ message: "Hauttyp gespeichert", user: toAuthUser(updatedUser) });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Serverfehler" });
  }
}


async function deleteSkinType(req, res) {
  try {
    const updatedUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.update({
        where: { id: req.user.userId },
        data:  { skinType: null },
      });

      await tx.userSkinProfileFact.deleteMany({
        where: {
          userId: req.user.userId,
          key: "skin_type",
        },
      });

      return user;
    })
    await refreshUserProfileEmbedding(req.user.userId)
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

async function updateProfile(req, res) {
  try {
    const { name } = req.body

    const updatedUser = await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        name: name || null,
      },
    })

    return res.json({
      message: "Profil aktualisiert",
      user: toAuthUser(updatedUser),
    })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: "Serverfehler" })
  }
}
async function updatePassword(req, res) {
  try {
    const { currentPassword, newPassword } = req.body
    if (!currentPassword || !newPassword)
      return res.status(400).json({ message: 'Beide Felder sind erforderlich' })

    const passwordMsg = getPasswordValidationMessage(newPassword)
    if (passwordMsg) return res.status(400).json({ message: passwordMsg })

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { password: true }
    })
    const valid = await bcrypt.compare(currentPassword, user.password)
    if (!valid) return res.status(401).json({ message: 'Aktuelles Passwort ist falsch' })

    const hashed = await bcrypt.hash(newPassword, 10)
    await prisma.user.update({
      where: { id: req.user.userId },
      data:  { password: hashed }
    })
    return res.json({ message: 'Passwort erfolgreich geändert' })
  } catch (error) {
    console.error(error)
    return res.status(500).json({ message: 'Serverfehler' })
  }
}
async function updateGender(req, res) {
  try {
    const { gender } = req.body
    const allowed = ['male', 'female', 'diverse', null]
    if (!allowed.includes(gender)) return res.status(400).json({ message: 'Ungültiges Geschlecht' })
    const updated = await prisma.user.update({
      where: { id: req.user.userId },
      data:  { gender: gender ?? null }
    })
    await refreshUserProfileEmbedding(req.user.userId)
    return res.json({ message: 'Gespeichert', user: toAuthUser(updated) })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ message: 'Serverfehler' })
  }
}
module.exports = { register, login, getAddress, getProfileContext, updateSkinProfile, updateAddress, updateSkinType, deleteSkinType, checkWelcomeCode, verifyCode, updateProfile, updatePassword, updateGender}
