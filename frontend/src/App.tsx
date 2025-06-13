// src/App.tsx
import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import { SocketProvider } from "./contexts/SocketContext";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import FormBuilder from "./pages/FormBuilder";
import CollaborativeForm from "./pages/CollaborativeForm";
import FormResponses from "./pages/FormResponses";
import JoinForm from "./pages/JoinForm";
import ProtectedRoute from "./components/ProtectedRoute";

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="min-h-screen bg-gray-50">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route
                path="/"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/join"
                element={
                  <ProtectedRoute>
                    <JoinForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forms/create"
                element={
                  <ProtectedRoute adminOnly>
                    <FormBuilder />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forms/:shareCode"
                element={
                  <ProtectedRoute>
                    <CollaborativeForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/forms/:formId/responses"
                element={
                  <ProtectedRoute adminOnly>
                    <FormResponses />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
