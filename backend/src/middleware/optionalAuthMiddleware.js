const jwt = require("jsonwebtoken");

function optionalAuthMiddleware(req, _res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next();
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.userId = decoded.userId || decoded.id;
    req.user = {
      ...decoded,
      userId: decoded.userId || decoded.id,
      id: decoded.id || decoded.userId,
    };
  } catch {
    // Anonymous chat should still work if the optional token is missing/expired.
  }

  next();
}

module.exports = optionalAuthMiddleware;
