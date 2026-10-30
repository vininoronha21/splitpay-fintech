import { createBrowserRouter, Navigate } from "react-router";
import { AppLayout } from "./components/AppLayout.tsx";
import { FriendsScreen } from "./components/FriendsScreen.tsx";
import { HomeScreen } from "./components/HomeScreen.tsx";
import { LoginScreen } from "./components/LoginScreen.tsx";
import { NewTransactionScreen } from "./components/NewTransactionScreen.tsx";
import { NotFound } from "./components/NotFound.tsx";
import { RouteError } from "./components/RouteError.tsx";
import { SettingsScreen } from "./components/SettingsScreen.tsx";
import { SpendingScreen } from "./components/SpendingScreen.tsx";
import { StatementScreen } from "./components/StatementScreen.tsx";
import { TransactionDetailScreen } from "./components/TransactionDetailScreen.tsx";
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
      {
        // Public landing page, outside AppLayout. Lazy: its own chunk, so app screens never download it.
        path: "/",
        // Shown while the chunk loads on a first visit: the hero's dark, so the page never flashes light.
        hydrateFallbackElement: <div className="min-h-dvh bg-hero" />,
        lazy: async () => {
          const { LandingScreen } = await import("./landing/LandingScreen.tsx");
          return { Component: LandingScreen };
        },
      },
      { path: "/entrar", element: <EntryRoute /> },
      {
        // Guard: every child redirects to /entrar while no name is saved.
        element: <AppLayout />,
        children: [
          { path: "/inicio", element: <HomeScreen /> },
          { path: "/gastos-do-mes", element: <SpendingScreen /> },
          { path: "/extrato", element: <StatementScreen /> },
          { path: "/extrato/:id", element: <TransactionDetailScreen /> },
          { path: "/amigos", element: <FriendsScreen /> },
          { path: "/configuracoes", element: <SettingsScreen /> },
          { path: "/novo-gasto", element: <NewTransactionScreen /> },
        ],
      },
      { path: "*", element: <NotFound /> },
    ],
  },
]);
