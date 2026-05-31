import { useAuthSession } from "@/contexts/AuthContext";

const ANONYMOUS_USER_ID = "anonymous";

export const useEffectiveLocalUserId = (): string | null => {
  const { currentUser, loading } = useAuthSession();

  if (currentUser?.uid) return currentUser.uid;
  if (loading) return null;
  return ANONYMOUS_USER_ID;
};
