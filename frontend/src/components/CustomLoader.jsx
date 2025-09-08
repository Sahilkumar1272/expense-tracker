import React from 'react';

const CustomLoader = ({ message = "Loading..." }) => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm z-50">
      <div className="flex flex-col items-center space-y-4">
        <div className="animate-spin rounded-full h-14 w-14 border-b-2 border-purple-500"></div>
        <p className="text-white font-semibold">{message}</p>
      </div>
    </div>
  );
};

export default CustomLoader;