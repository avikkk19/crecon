import React from "react";
import { Route, Routes } from "react-router-dom";
import SignupForm from "./components/Signup.jsx";
import SignInForm from "./components/Signin.jsx";
import HeroSection from "./components/Herosection.jsx";
import Navbar from "./components/Navbar.jsx";
import { AuthProvider } from "./components/auth/AuthContext.jsx";
import AuthRoute from "./components/auth/AuthRoute.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import ModernChatInterface from "./components/Chat.jsx";
import Footer from "./components/Footer.jsx";
import Blog from "./components/Blog.jsx";

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
