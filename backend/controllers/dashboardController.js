import { User } from "../models/User.js";

// ------------------ DASHBOARD CONTROLLER ------------------
export const getDashboardData = async (req, res) => {
  try {
    // `req.user` is attached by verifyToken middleware
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      user: { name: user.name },
    });
  } catch (err) {
    console.error("Dashboard error:", err);
    res.status(500).json({ message: "Server error", error: err.message });
  }
};





// // controllers/dashboardController.js
// import Trip from "../models/Trip.js";
// import { User } from "../models/User.js";
// import { verifyToken } from "../middlewares/authMiddleware.js";
// import url from "url";

// export const handleDashboard = async (req, res) => {
//   // Verify token before showing dashboard
//   const authorized = verifyToken(req, res);
//   if (!authorized) return;

//   const { pathname, query } = url.parse(req.url, true);

//   // ✅ GET dashboard data
//   if (pathname.startsWith("/dashboard") && req.method === "GET") {
//     try {
//       const userId = req.user.id; // decoded from token

//       const user = await User.findById(userId);
//       if (!user) {
//         res.writeHead(404, { "Content-Type": "application/json" });
//         return res.end(JSON.stringify({ message: "User not found" }));
//       }

//       const trips = await Trip.find({ userId }).sort({ date: -1 });
//       const totalTrips = trips.length;
//       const totalBudget = trips.reduce((sum, t) => sum + (t.budget || 0), 0);
//       const upcoming = trips.filter((t) => new Date(t.date) > new Date()).length;

//       res.writeHead(200, { "Content-Type": "application/json" });
//       return res.end(
//         JSON.stringify({
//           name: user.name,
//           totalTrips,
//           totalBudget,
//           upcoming,
//           trips,
//         })
//       );
//     } catch (err) {
//       console.error("Dashboard error:", err);
//       res.writeHead(500, { "Content-Type": "application/json" });
//       return res.end(JSON.stringify({ message: "Server error", error: err.message }));
//     }
//   }

//   // ❌ No route matched
//   return false;
// };
