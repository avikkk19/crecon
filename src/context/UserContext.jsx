import { useAuth } from "../components/auth/AuthContext";

// Re-export useAuth as useUser for compatibility
export function useUser() {
  const auth = useAuth();

  // Return the same object but rename 'user' to maintain backward compatibility
  return {
    user: auth.user,
    isLoading: auth.loading,
    isAuthenticated: auth.isAuthenticated,
    login: auth.login,
    signup: auth.signup,
    logout: auth.logout,
  };
}
