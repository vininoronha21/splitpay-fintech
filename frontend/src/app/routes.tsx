import { createBrowserRouter } from "react-router";
import HealthStatus from "./components/HealthStatus.tsx";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <HealthStatus />,
  },
]);
