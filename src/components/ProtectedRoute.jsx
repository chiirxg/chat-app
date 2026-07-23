import { useAuth } from "../context/AuthContext";
import Login from "./Login";

function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
        width: "100vw",
        background: "var(--bg-gradient, #0f172a)",
        color: "#818cf8"
      }}>
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "1rem"
        }}>
          <div style={{
            width: "40px",
            height: "40px",
            border: "3px solid rgba(99, 102, 241, 0.2)",
            borderTopColor: "#6366f1",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite"
          }} />
          <span style={{ fontSize: "0.9rem", color: "#94a3b8" }}>Loading chat application...</span>
          <style>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  return children;
}

export default ProtectedRoute;
