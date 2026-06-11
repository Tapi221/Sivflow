import { useEffect, useRef } from "react";
import { resetStartupTasks, runStartupTasks } from "./RunStartupTasks";



const useStartupTasks = (userId?: string | null) => {
  const startedUserIdRef = useRef<string | null>(null);

  useEffect(() => {
    let disposed = false;

    if (!userId) {
      startedUserIdRef.current = null;
      void resetStartupTasks();

      return () => {
        disposed = true;
      };
    }

    if (startedUserIdRef.current === userId) {
      return () => {
        disposed = true;
      };
    }

    startedUserIdRef.current = userId;

    void runStartupTasks({
      userId,
      isDisposed: () => disposed,
    });

    return () => {
      disposed = true;
    };
  }, [userId]);
};



export { useStartupTasks };
