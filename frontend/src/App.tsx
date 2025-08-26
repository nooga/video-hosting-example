import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import HomePage from "./pages/HomePage";
import VideoDetailPage from "./pages/VideoDetailPage";
import "./index.css";
import { useAuth0 } from "@auth0/auth0-react";
import { VideoAPI } from "./services/api";

function App() {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();

  useEffect(() => {
    VideoAPI.setAuthTokenGetter(async () => {
      try {
        const token = await getAccessTokenSilently();
        return token;
      } catch (e) {
        return null;
      }
    });
  }, [getAccessTokenSilently]);

  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/video/:videoId" element={<VideoDetailPage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
