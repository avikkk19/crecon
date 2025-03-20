import React from "react";
import { Route, Routes } from "react-router-dom";
import SignupForm from "./components/Signup";
import SignInForm from "./components/Signin";
import HeroSection from "./components/HeroSection";
import Navbar from "./components/Navbar";
import { AuthProvider } from "./components/auth/AuthContext";
import AuthRoute from "./components//auth/AuthRoute";
import ProtectedRoute from "./components/auth/ProtectedRoute";
import ModernChatInterface from "./components/Chat";
import Footer from "./components/Footer";
import Blog from "./components/Blog";

const App = () => {
  return (
    <AuthProvider>
      <Navbar />
      <Routes>
        <Route path="/" element={<HeroSection />} />

        {/* Auth routes - redirect if already logged in */}
        <Route
          path="/signin"
          element={
            <AuthRoute>
              <SignInForm />
            </AuthRoute>
          }
        />

        <Route
          path="/signup"
          element={
            <AuthRoute>
              <SignupForm />
            </AuthRoute>
          }
        />

        {/* Protected routes - require authentication */}
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <ModernChatInterface />
            </ProtectedRoute>
          }
        />

        <Route
          path="/blog"
          element={
            <ProtectedRoute>
              <Blog />
            </ProtectedRoute>
          }
        />
      </Routes>
      <Footer />
    </AuthProvider>
  );
};

export default App;