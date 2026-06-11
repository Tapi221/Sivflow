import { useContext } from "react";
import { AuthSessionContext } from "./AuthSessionContextCore";



const useAuthSession = () => {
  return useContext(AuthSessionContext);
};



export { useAuthSession };
