require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

// Models
const { HoldingsModel } = require("./model/HoldingsModel");
const { PositionsModel } = require("./model/PositionsModel");
const { OrdersModel } = require("./model/OrdersModel");

const app = express();

// ✅ FIX 1: Correct PORT (local + Railway/Vercel)
const PORT = process.env.PORT || 8080;
const uri = process.env.MONGOOSE_URL;

// ✅ FIX 2: JSON parser (body-parser not needed anymore)
app.use(express.json());

// ✅ FIX 3: CORS (safe + simple)
const allowedOrigins = [
  "https://zerodha-ashen.vercel.app",
  "https://zerodha-jgh3.vercel.app",
  "http://localhost:8080"
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS not allowed"));
      }
    },
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ FIX 4: Root health check
app.get("/", (req, res) => {
  res.send("✅ Server is working fine!");
});

// ================= ROUTES =================

// Get all holdings
app.get("/allHoldings", async (req, res) => {
  try {
    const holdings = await HoldingsModel.find({});
    res.json(holdings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all positions
app.get("/allPositions", async (req, res) => {
  try {
    const positions = await PositionsModel.find({});
    res.json(positions);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all orders
app.get("/allOrders", async (req, res) => {
  try {
    const orders = await OrdersModel.find({});
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Place new order
app.post("/newOrder", async (req, res) => {
  try {
    const { name, qty, price, mode } = req.body;

    if (!name || !qty || !price || !mode) {
      return res.status(400).json({ error: "Missing fields" });
    }

    // Save order
    await OrdersModel.create({ name, qty, price, mode });

    let holding = await HoldingsModel.findOne({ name });

    if (mode === "BUY") {
      if (holding) {
        const totalQty = holding.qty + qty;
        const newAvg =
          (holding.avg * holding.qty + price * qty) / totalQty;

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
    }

    if (mode === "SELL") {
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

    res.status(201).json({ message: "✅ Order processed successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ FIX 5: DB connect FIRST, then server start
mongoose
  .connect(uri)
  .then(() => {
    console.log("✅ DB Connected successfully!");
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🚀 App started on port ${PORT}`);
    });
  })
  .catch((err) => console.error("❌ DB Connection Error:", err));
