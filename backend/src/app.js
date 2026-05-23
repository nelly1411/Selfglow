const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const productRoutes = require("./routes/product.routes");
const prisma = require("./config/prisma");
const authRoutes = require("./routes/auth");
const checkoutRoutes = require("./routes/checkout.routes");
const chatRoutes = require("./routes/chat.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const reviewRoutes = require("./routes/review.routes");
const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/checkout", checkoutRoutes);
app.use("/api/chat", chatRoutes);

app.get("/", (req, res) => {
  res.send("SelfGlow backend is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API works" });
});

app.use("/api/products", productRoutes);

app.use("/api/wishlist", wishlistRoutes);

app.use("/api/reviews", reviewRoutes);

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
