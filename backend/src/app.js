const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const productRoutes = require("./routes/product.routes");
const prisma = require("./config/prisma");
const authRoutes = require("./routes/auth");
const checkoutRoutes = require("./routes/checkout.routes");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/checkout", checkoutRoutes);
app.get("/", (req, res) => {
  res.send("SelfGlow backend is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API works" });
});

app.use("/api/products", productRoutes);

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
