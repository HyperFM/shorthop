import { useEffect } from "react";
import { useLocation } from "wouter";

export default function TermsOfService() {
  const [, navigate] = useLocation();

  useEffect(() => {
    navigate("/privacy", { replace: true });
  }, [navigate]);

  return null;
}
