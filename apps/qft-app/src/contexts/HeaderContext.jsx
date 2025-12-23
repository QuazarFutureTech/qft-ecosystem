import React, { createContext, useContext, useState } from 'react';

const HeaderContext = createContext();

export const HeaderProvider = ({ children }) => {
  const [headerContent, setHeaderContent] = useState(null); // Or some default value

  return (
    <HeaderContext.Provider value={{ headerContent, setHeaderContent }}>
      {children}
    </HeaderContext.Provider>
  );
};

export const useHeader = () => {
  return useContext(HeaderContext);
};