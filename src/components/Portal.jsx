import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

/**
 * Portal – render children into document.body.
 * No body overflow/position changes – scrollbar stays visible, content does not shift.
 */
const Portal = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(children, document.body);
};

export default Portal;
