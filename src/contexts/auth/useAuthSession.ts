import { useContext } from "react";
import { AuthSessionContext } from "@/contexts/auth/AuthSessionContextCore";

const useAuthSession = () => {
  return useContext(AuthSessionContext);
};

export { useAuthSession };
