import React from "react";
import { Route, Routes } from "react-router-dom";
import SignupForm from "./components/Signup.jsx";
import SignInForm from "./components/Signin.jsx";
import HeroSection from "./components/HeroSection.jsx";
import Navbar from "./components/Navbar.jsx";
import { AuthProvider } from "./components/auth/AuthContext.jsx";
import AuthRoute from "./components/auth/AuthRoute.jsx";
import ProtectedRoute from "./components/auth/ProtectedRoute.jsx";
import ModernChatInterface from "./components/Chat.jsx";
import Footer from "./components/Footer.jsx";
import Blog from "./components/Blog.jsx";
import Tandc from "./components/pages/Tandc.jsx";
import Privacy from "./components/pages/Privacy.jsx";
import Security from "./components/pages/Security.jsx";
import Abtdev from "./components/pages/Abtdev.jsx";
import Portfolio from "./components/pages/Portfolio.jsx";
import Notifications from "./components/Notifications.jsx";
import Profile from "./components/Profile.jsx";

const App = () => {
  return (
    <AuthProvider>
      <div className="flex">
        <Navbar />
        <div className="min-h-screen w-full pl-0 md:pl-[216px] pb-24 md:pb-0">
          <Routes>
            <Route path="/" element={<HeroSection />} />
            <Route path="/portfolio" element={<Portfolio />} />

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
            {/* Public routes */}
            <Route path="/tandc" element={<Tandc />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/security" element={<Security />} />
            <Route path="/abtdev" element={<Abtdev />} />

            {/* Protected routes - require authentication */}
            <Route
              path="/chat"
              element={
                <ProtectedRoute>
                  <ModernChatInterface />
                </ProtectedRoute>
              }
            />

            {/* Add this new route with userId parameter */}
            <Route
              path="/chat/:userId"
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

            <Route
              path="/notifications"
              element={
                <ProtectedRoute>
                  <Notifications />
                </ProtectedRoute>
              }
            />

            {/* Profile routes */}
            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile/:userId"
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              }
            />
          </Routes>
          <Footer />
        </div>
      </div>
    </AuthProvider>
  );
};

export default App;
