import React, { useEffect } from "react";
import { BrowserRouter as Router } from "react-router-dom";
import "./index.css";
import { useAuth0 } from "@auth0/auth0-react";
import { VideoAPI } from "./services/api";
import { ThemeProvider } from "./context/ThemeContext";
import AnimatedRoutes from "./components/AnimatedRoutes";

function App() {
  const { getAccessTokenSilently } = useAuth0();

  useEffect(() => {
    VideoAPI.setAuthTokenGetter(async () => {
      try {
        return await getAccessTokenSilently();
      } catch {
        return null;
      }
    });
  }, [getAccessTokenSilently]);

  // Prevent the browser from navigating away when a file is dropped outside the upload zone.
  useEffect(() => {
    const preventBrowserFileDrop = (e: DragEvent) => {
      e.preventDefault();
    };
    window.addEventListener("dragover", preventBrowserFileDrop);
    window.addEventListener("drop", preventBrowserFileDrop);
    return () => {
      window.removeEventListener("dragover", preventBrowserFileDrop);
      window.removeEventListener("drop", preventBrowserFileDrop);
    };
  }, []);

  return (
    <ThemeProvider>
      <Router>
        <div className="App min-h-screen flex flex-col">
          <AnimatedRoutes />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;
