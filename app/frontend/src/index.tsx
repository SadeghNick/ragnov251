import React, { useState, useContext } from "react";
import ReactDOM from "react-dom/client";
import { createHashRouter, RouterProvider, Navigate } from "react-router-dom";
import { I18nextProvider } from "react-i18next";
import { HelmetProvider } from "react-helmet-async";
import { initializeIcons } from "@fluentui/react";
import { MsalProvider } from "@azure/msal-react";
import { AuthenticationResult, EventType, PublicClientApplication } from "@azure/msal-browser";

import "./index.css";

import Chat from "./pages/chat/Chat";
import LayoutWrapper from "./layoutWrapper";
import i18next from "./i18n/config";
import { msalConfig, useLogin } from "./authConfig";
import { LoginContext } from "./loginContext";
import Login from "./pages/Login";

initializeIcons();

// This component wraps Chat and redirects to /login when not logged in and not using MSAL
const ProtectedRoute = () => {
  const { loggedIn } = useContext(LoginContext);
  // Only redirect when not using Azure login (useLogin=false) and user isn’t logged in
  if (!useLogin && !loggedIn) {
    return <Navigate to="/login" replace />;
  }
  return <Chat />;
};

const router = createHashRouter([
  {
    path: "/",
    element: <LayoutWrapper />,
    children: [
      { index: true, element: <ProtectedRoute /> },
      { path: "login", element: <Login /> },
      {
        path: "*",
        lazy: () => import("./pages/NoPage")
      }
    ]
  }
]);

const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);

const AppRoot: React.FC<{ msalInstance?: PublicClientApplication }> = ({ msalInstance }) => {
  const [loggedIn, setLoggedIn] = useState<boolean>(() => !!localStorage.getItem("access_token"));

  return (
    <I18nextProvider i18n={i18next}>
      <HelmetProvider>
        <LoginContext.Provider value={{ loggedIn, setLoggedIn }}>
          {useLogin && msalInstance ? (
            <MsalProvider instance={msalInstance}>
              <RouterProvider router={router} />
            </MsalProvider>
          ) : (
            <RouterProvider router={router} />
          )}
        </LoginContext.Provider>
      </HelmetProvider>
    </I18nextProvider>
  );
};

// Bootstrap the app once; conditionally wrap with MsalProvider when login is enabled
(async () => {
  let msalInstance: PublicClientApplication | undefined;

  if (useLogin) {
    msalInstance = new PublicClientApplication(msalConfig);
    try {
      await msalInstance.initialize();

      // Default active account to the first one if none is set
      if (!msalInstance.getActiveAccount() && msalInstance.getAllAccounts().length > 0) {
        msalInstance.setActiveAccount(msalInstance.getAllAccounts()[0]);
      }

      // Keep active account in sync on login success
      msalInstance.addEventCallback(event => {
        if (event.eventType === EventType.LOGIN_SUCCESS && event.payload) {
          const result = event.payload as AuthenticationResult;
          if (result.account) {
            msalInstance!.setActiveAccount(result.account);
          }
        }
      });
    } catch (e) {
      // Non-fatal: render the app even if MSAL initialization fails
      // eslint-disable-next-line no-console
      console.error("MSAL initialize failed", e);
      msalInstance = undefined;
    }
  }

  root.render(
    <React.StrictMode>
      <AppRoot msalInstance={msalInstance} />
    </React.StrictMode>
  );
})();
