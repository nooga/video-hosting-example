import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { Auth0Provider } from "@auth0/auth0-react";

const root = ReactDOM.createRoot(
  document.getElementById("root") as HTMLElement
);

const runtimeConfig = window.ENV || {};

const domain =
  runtimeConfig.REACT_APP_AUTH0_DOMAIN ||
  process.env.REACT_APP_AUTH0_DOMAIN ||
  "";
const clientId =
  runtimeConfig.REACT_APP_AUTH0_CLIENT_ID ||
  process.env.REACT_APP_AUTH0_CLIENT_ID ||
  "";
const audience =
  runtimeConfig.REACT_APP_AUTH0_AUDIENCE ||
  process.env.REACT_APP_AUTH0_AUDIENCE ||
  "";

root.render(
  <React.StrictMode>
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri: window.location.origin,
        audience,
        scope: "openid profile email",
      }}
      cacheLocation="localstorage"
      useRefreshTokens={true}
    >
      <App />
    </Auth0Provider>
  </React.StrictMode>
);
