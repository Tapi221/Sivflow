import { Navigate } from "react-router-dom";

const Tasks = () => {
  return <Navigate to="/schedule?mode=task" replace />;
};

export default Tasks;
