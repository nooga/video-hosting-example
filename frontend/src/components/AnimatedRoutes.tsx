import React from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence as FramerAnimatePresence } from "framer-motion";
import HomePage from "../pages/HomePage";
import VideoDetailPage from "../pages/VideoDetailPage";
import PageTransition from "./PageTransition";

/** CRA + @types/react 18 compat */
const AnimatePresence = FramerAnimatePresence as React.FC<{
  mode?: "wait" | "sync" | "popLayout";
  children?: React.ReactNode;
}>;

const AnimatedRoutes: React.FC = () => {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route
          path="/"
          element={
            <PageTransition>
              <HomePage />
            </PageTransition>
          }
        />
        <Route
          path="/video/:videoId"
          element={
            <PageTransition>
              <VideoDetailPage />
            </PageTransition>
          }
        />
      </Routes>
    </AnimatePresence>
  );
};

export default AnimatedRoutes;
