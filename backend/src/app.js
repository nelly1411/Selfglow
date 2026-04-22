const express = require("express"); // import packages
const cors = require("cors");
const dotenv = require("dotenv");
const prisma = require("./config/prisma");

dotenv.config(); // load the variables from .env

const app = express(); // create the main backend application

// Middleware: processing steps
app.use(cors());  // allow cross-origin access
app.use(express.json()); // raw json -> JavaScript object, req.body works

// Test route
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

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});