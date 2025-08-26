// Minimal useAuth hook stub to satisfy imports in landing page.
export function useAuth() {
  return {
    user: null,
    signIn: async () => {},
    signOut: async () => {},
    loading: false,
  };
}

export default useAuth;
