import axios from "axios";

const api = axios.create({
  baseURL:
    process.env.NODE_ENV === "production"
      ? "https://zerodha-production-c102.up.railway.app"
      : "http://localhost:3002",
});

export default api;
