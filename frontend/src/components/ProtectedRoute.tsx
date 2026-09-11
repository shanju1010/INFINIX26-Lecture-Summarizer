import { Navigate, Outlet, useLocation } from "react-router-dom";

const AUTH_KEY = "LectureIQ_auth";

type AuthData = {
  isLoggedIn?: boolean;
};

function isAuthenticated(): boolean {
  try {
    const stored = localStorage.getItem(AUTH_KEY);

    if (!stored) {
      return false;
    }

    const auth = JSON.parse(stored) as AuthData;
    return auth?.isLoggedIn === true;
  } catch {
    return false;
  }
}

export default function ProtectedRoute() {
  const location = useLocation();

  if (!isAuthenticated()) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location.pathname + location.search }}
      />
    );
  }

  return <Outlet />;
}
