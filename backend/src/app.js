const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const prisma = require("./config/prisma");
const authRoutes = require("./src/routes/auth");

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);

app.get("/", (req, res) => {
  res.send("SelfGlow backend is running");
});

app.get("/api/test", (req, res) => {
  res.json({ message: "API works" });
});

app.get("/api/test-db", async (req, res) => {
  try {
    const products = await prisma.product.findMany();
    res.status(200).json(products);
  } catch (error) {
    console.error("Database error:", error);
    res.status(500).json({ message: "Database connection failed" });
  }
});

app.get("/api/products", async (req, res) => {
  try {
    const products = await prisma.product.findMany();

    res.status(200).json(products);
  } catch (error) {
    console.error("Failed to fetch products:", error);
    res.status(500).json({ message: "Failed to fetch products" });
  }
});

app.get("/api/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({ message: "Invalid product id" });
    }

    const product = await prisma.product.findUnique({
      where: { id: id },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Failed to fetch product:", error);
    res.status(500).json({ message: "Failed to fetch product" });
  }
});

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});