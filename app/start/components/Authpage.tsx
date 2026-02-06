"use client";
import React, { useState } from "react";
import LoginForm from "./LoginForm";
import RegistroAsesor from "./RegistroAsesor";

interface AuthPageProps {
  onAuthSuccess: (userData: { rol: string; nombre: string }) => void;
}

export default function AuthPage({ onAuthSuccess }: AuthPageProps) {
  const [view, setView] = useState<"login" | "register">("login");

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0a0f 0%, #12121a 50%, #0d0d14 100%)",
      padding: "20px",
    }}>
      {view === "login" ? (
        <LoginForm
          onSuccess={(userData) => {
            if (userData) {
              onAuthSuccess(userData);
            }
          }}
          onRegisterClick={() => setView("register")}
        />
      ) : (
        <RegistroAsesor
          onSuccess={() => setView("login")}
          onLoginClick={() => setView("login")}
        />
      )}
    </div>
  );
}