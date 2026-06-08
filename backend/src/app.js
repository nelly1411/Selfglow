const express = require("express");
const cors    = require("cors");
const dotenv  = require("dotenv");
dotenv.config();

const reviewRoutes = require("./routes/review.routes");
const productRoutes = require("./routes/product.routes");
const prisma = require("./config/prisma");
const authRoutes = require("./routes/auth");
const checkoutRoutes = require("./routes/checkout.routes");
const chatRoutes = require("./routes/chat.routes");
const skinAnalysisRoutes = require("./routes/skinAnalysis.routes");
const wishlistRoutes = require("./routes/wishlist.routes");
const cartRoutes = require("./routes/cart.routes");
const app = express();
const chatHistoryRoutes = require('./routes/chatHistory.routes.js')

const allowedOrigins = [
    'http://localhost:5173',
    process.env.FRONTEND_URL,
  ].filter(Boolean)
  
  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          return callback(null, true)
        }
  
        if (allowedOrigins.includes(origin)) {
          return callback(null, true)
        }
  
        if (origin.endsWith('.vercel.app')) {
          return callback(null, true)
        }
  
        return callback(new Error(`Not allowed by CORS: ${origin}`))
      },
      credentials: true,
    })
  )



app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ limit: '10mb', extended: true }))

app.use("/api/auth",          authRoutes);
app.use("/api/checkout",      checkoutRoutes);
app.use("/api/chat",          chatRoutes);
app.use('/api/skin-analysis', skinAnalysisRoutes);
app.use("/api/products",      productRoutes);
app.use("/api/wishlist",      wishlistRoutes);
app.use("/api/reviews",       reviewRoutes);
app.use("/api/cart",          cartRoutes);
app.use('/api/chat-history', chatHistoryRoutes)

app.get("/", (req, res) => res.send("SelfGlow backend is running"));

app.get("/api/test", (req, res) => res.json({ message: "API works" }));

const PORT = process.env.PORT || 5050;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`)
  })