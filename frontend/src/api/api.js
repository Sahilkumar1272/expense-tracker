import axios from "axios";

// Create axios instance pointing to backend
const api = axios.create({
  baseURL: "http://127.0.0.1:5000", // Flask backend URL
});

export default api;
