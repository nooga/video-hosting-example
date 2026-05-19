import React from "react";
import { motion as framerMotion } from "framer-motion";

const motion = {
  div: framerMotion.div as React.FC<
    React.HTMLAttributes<HTMLDivElement> & {
      variants?: object;
      initial?: string;
      animate?: string;
      exit?: string;
      transition?: object;
    }
  >,
};

type PageTransitionProps = {
  children: React.ReactNode;
};

const pageVariants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
};

const pageTransition = {
  duration: 0.22,
  ease: [0.25, 0.1, 0.25, 1] as const,
};

const PageTransition: React.FC<PageTransitionProps> = ({ children }) => (
  <motion.div
    variants={pageVariants}
    initial="initial"
    animate="animate"
    exit="exit"
    transition={pageTransition}
    className="flex-1 flex flex-col min-h-0"
  >
    {children}
  </motion.div>
);

export default PageTransition;
