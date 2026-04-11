import { Navigate } from "react-router-dom";
import { AdminPortalPage } from "./AdminPortalPage.js";
import { isUserLoggedIn } from "../../lib/auth.js";

export function AdminRoute() {
  if (!isUserLoggedIn()) {
    return <Navigate to="/login" replace />;
  }

  const userStr = localStorage.getItem("devcentral_user");

  if (!userStr) {
    return <Navigate to="/login" replace />;
  }

  try {
    const user = JSON.parse(userStr);

    // If they aren't an admin, kick them back to the normal dashboard
    if (user.role !== "ADMIN") {
      return <Navigate to="/dashboard" replace />;
    }

    // If they are an admin, render the requested page (Outlet)

    return <AdminPortalPage />;
  } catch (error) {
    console.error("Error parsing user data from localStorage:", error);
    return <Navigate to="/login" replace />;
  }
}
