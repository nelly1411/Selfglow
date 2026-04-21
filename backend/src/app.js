const express = require("express"); // import packages
const cors = require("cors");
const dotenv = require("dotenv");

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

const PORT = process.env.PORT || 5050;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});