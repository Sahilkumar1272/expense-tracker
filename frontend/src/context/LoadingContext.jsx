import React, { createContext, useContext, useState, useCallback } from "react";
import CustomLoader from "../components/CustomLoader";

const LoadingContext = createContext();

export const LoadingProvider = ({ children }) => {
  const [loading, setLoading] = useState({ visible: false, message: "" });

  const showLoading = useCallback((message = "Loading...") => {
    setLoading({ visible: true, message });
  }, []);

  const hideLoading = useCallback(() => {
    setLoading({ visible: false, message: "" });
  }, []);

  return (
    <LoadingContext.Provider value={{ showLoading, hideLoading }}>
      {children}
      {loading.visible && <CustomLoader message={loading.message} />}
    </LoadingContext.Provider>
  );
};

export const useLoading = () => useContext(LoadingContext);