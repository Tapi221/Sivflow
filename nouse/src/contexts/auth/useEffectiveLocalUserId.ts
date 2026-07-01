import { useAuthSession } from "./useAuthSession";



const ANONYMOUS_USER_ID = "anonymous";



const useEffectiveLocalUserId = (): string | null => {
  const { currentUser, loading } = useAuthSession();

  if (currentUser?.uid) return currentUser.uid;
  if (loading) return null;
  return ANONYMOUS_USER_ID;
};



export { useEffectiveLocalUserId };
