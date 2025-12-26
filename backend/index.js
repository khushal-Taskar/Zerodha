require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
const cors = require("cors");

// Models Import
const { HoldingsModel } = require("./model/HoldingsModel");
const { PositionsModel } = require("./model/PositionsModel");
const { OrdersModel } = require("./model/OrdersModel");

// ✅ FIX 1: Dynamic PORT (Railway ke liye zaroori)
const PORT = process.env.PORT || 3002;
const uri = process.env.MONGOOSE_URL;

const app = express();

// ✅ FIX 2: Sahi CORS Configuration
// Note: URLs ke aage slash '/' nahi hona chahiye
const allowedOrigins = [
  'https://zerodha-ashen.vercel.app',
  'https://zerodha-jgh3.vercel.app',
  'http://localhost:3000' // Local testing ke liye
];

app.use(cors({
  origin: function (origin, callback) {
    // !origin ka matlab hai non-browser requests (like Postman) allow hain
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true
}));

app.use(bodyParser.json());

// ✅ FIX 3: Root Route (Server check karne ke liye)
app.get("/", (req, res) => {
  res.send("Server is working fine!");
});

// --- API Routes ---

// 1. Get All Holdings
app.get("/allHoldings", async (req, res) => {
  let allHoldings = await HoldingsModel.find({});
  res.json(allHoldings);
});

// 2. Get All Positions
app.get("/allPositions", async (req, res) => {
  let allPositions = await PositionsModel.find({});
  res.json(allPositions);
});

// 3. Get All Orders
app.get("/allOrders", async (req, res) => {
  try {
    const orders = await OrdersModel.find({});
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Place New Order (Buy/Sell Logic)
app.post("/newOrder", async (req, res) => {
  try {
    const { name, qty, price, mode } = req.body;

    // Save order
    const newOrder = new OrdersModel({ name, qty, price, mode });
    await newOrder.save();

    // Update Holdings
    let holding = await HoldingsModel.findOne({ name });

    if (mode === "BUY") {
      if (holding) {
        const totalQty = holding.qty + qty;
        const newAvg = (holding.avg * holding.qty + price * qty) / totalQty;
        holding.qty = totalQty;
        holding.avg = newAvg;
        holding.price = price;
        await holding.save();
      } else {
        await HoldingsModel.create({
          name,
          qty,
          avg: price,
          price,
          net: "0%",
          day: "0%",
        });
      }
    } else if (mode === "SELL") {
      if (!holding) {
        return res.status(400).json({ error: "No holding to sell" });
      }
      holding.qty -= qty;
      holding.price = price;

      if (holding.qty <= 0) {
        await HoldingsModel.deleteOne({ name });
      } else {
        await holding.save();
      }
    }

    res.status(201).json({ message: "Order processed & holdings updated" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ FIX 4: Server Start & Database Connection
app.listen(PORT, () => {
  console.log(`App started on port ${PORT}`);
  
  // DB Connection ab server start hone ke baad check hoga
  mongoose.connect(uri)
    .then(() => console.log("DB Connected successfully!"))
    .catch((err) => console.log("DB Connection Error:", err));
});