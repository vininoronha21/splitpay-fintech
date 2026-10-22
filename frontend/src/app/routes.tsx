import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "./components/AppLayout.tsx";
import { HomeScreen } from "./components/HomeScreen.tsx";
import { LoginScreen } from "./components/LoginScreen.tsx";
import { NotFound } from "./components/NotFound.tsx";
import { RouteError } from "./components/RouteError.tsx";
import { ScreenPlaceholder } from "./components/ScreenPlaceholder.tsx";
import { SettingsScreen } from "./components/SettingsScreen.tsx";
import { SpendingScreen } from "./components/SpendingScreen.tsx";
import { readUserName } from "../lib/userName.ts";

/** /entrar is skipped once a name is saved; "Sair" in Configurações clears it. */
function EntryRoute() {
  return readUserName() ? <Navigate to="/inicio" replace /> : <LoginScreen />;
}

export const router = createBrowserRouter([
  {
    // Pathless root: a render error on any screen shows the pt-BR RouteError, not the router's default page.
    errorElement: <RouteError />,
    children: [
      // The landing page replaces this redirect in 013.
      { path: "/", element: <Navigate to="/inicio" replace /> },
      { path: "/entrar", element: <EntryRoute /> },
      {
        // Guard: every child redirects to /entrar while no name is saved.
        element: <AppLayout />,
        children: [
          { path: "/inicio", element: <HomeScreen /> },
          { path: "/gastos-do-mes", element: <SpendingScreen /> },
          { path: "/extrato", element: <ScreenPlaceholder title="Extrato" /> },
          { path: "/amigos", element: <ScreenPlaceholder title="Amigos" /> },
          { path: "/configuracoes", element: <SettingsScreen /> },
          { path: "/novo-gasto", element: <ScreenPlaceholder title="Novo gasto" /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
