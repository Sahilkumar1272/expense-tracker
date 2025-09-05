import React from 'react';

const LoadingSpinner = ({ 
  message = 'Loading...', 
  size = 'large', 
  fullScreen = true,
  className = '' 
}) => {
  const content = (
    <div className={`flex flex-col items-center justify-center space-y-10 ${className}`}>
      {/* Ultra-premium loading animation */}
      <div className="relative w-48 h-48">
        {/* Outer glow ring */}
        <div className="absolute inset-0 rounded-full bg-gradient-to-r from-purple-500/30 via-pink-500/30 to-purple-500/30 blur-xl animate-spin" style={{ animationDuration: '4s' }}></div>
        
        {/* Multiple rotating rings */}
        {[...Array(4)].map((_, i) => (
          <div 
            key={i}
            className={`absolute rounded-full border-2 border-transparent bg-gradient-to-r from-purple-${400 + i * 100} via-pink-${400 + i * 100} to-purple-${400 + i * 100} animate-spin`}
            style={{ 
              inset: `${i * 8}px`,
              animationDuration: `${2 + i * 0.5}s`,
              animationDirection: i % 2 === 0 ? 'normal' : 'reverse',
              opacity: 1 - i * 0.15
            }}
          ></div>
        ))}
        
        {/* Central logo with luxury styling */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative group">
            {/* Multiple glow layers */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-400 to-pink-600 rounded-full blur-2xl opacity-60 group-hover:opacity-80 transition-opacity animate-pulse"></div>
            <div className="absolute inset-2 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full blur-xl opacity-40 animate-pulse" style={{ animationDelay: '0.5s' }}></div>
            
            {/* Main logo */}
            <div className="relative bg-gradient-to-br from-slate-800 via-purple-800 to-slate-800 rounded-full p-8 border border-white/30 shadow-2xl backdrop-blur-sm">
              <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent rounded-full"></div>
              <div className="relative bg-gradient-to-br from-purple-600 to-pink-600 rounded-full p-4 shadow-inner">
                <span className="text-white font-bold text-4xl drop-shadow-2xl flex items-center justify-center w-12 h-12">
                  E
                </span>
              </div>
              
              {/* Orbiting particles */}
              <div className="absolute inset-0 animate-spin" style={{ animationDuration: '8s' }}>
                {[...Array(6)].map((_, i) => (
                  <div 
                    key={i}
                    className="absolute w-2 h-2 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full shadow-lg"
                    style={{
                      top: '50%',
                      left: '50%',
                      transform: `rotate(${i * 60}deg) translateX(50px) translateY(-1px)`,
                      animationDelay: `${i * 0.1}s`
                    }}
                  ></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Luxury text styling */}
      <div className="text-center space-y-6 max-w-md">
        <div className="relative">
          <h2 className="text-3xl font-light text-white tracking-[0.2em] mb-2">
            {message.split(' ')[0]}
          </h2>
          <p className="text-xl font-extralight text-gray-300 tracking-[0.15em]">
            {message.split(' ').slice(1).join(' ')}
          </p>
          
          {/* Animated underline */}
          <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-purple-400 to-pink-400 animate-pulse" style={{ width: '60%' }}></div>
        </div>
        
        {/* Elegant progress visualization */}
        <div className="space-y-4">
          {/* Breathing dots */}
          <div className="flex justify-center space-x-3">
            {[...Array(5)].map((_, i) => (
              <div 
                key={i}
                className="w-3 h-3 bg-gradient-to-r from-purple-400 to-pink-400 rounded-full shadow-lg animate-pulse"
                style={{ 
                  animationDelay: `${i * 0.2}s`,
                  animationDuration: '2s'
                }}
              ></div>
            ))}
          </div>
          
          {/* Sophisticated progress bar */}
          <div className="relative w-80 h-1 bg-white/5 rounded-full overflow-hidden backdrop-blur-sm">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-pulse"></div>
            <div className="h-full bg-gradient-to-r from-purple-500 via-pink-500 to-purple-500 rounded-full shadow-lg animate-pulse"></div>
          </div>
        </div>
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center z-50 overflow-hidden">
        {/* Premium background effects */}
        <div className="absolute inset-0">
          {/* Animated mesh gradient */}
          <div className="absolute inset-0 opacity-30">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-purple-500/20 via-transparent to-pink-500/20 animate-pulse"></div>
            <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-radial-gradient from-purple-400/10 to-transparent blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
            <div className="absolute bottom-0 left-0 w-1/2 h-1/2 bg-radial-gradient from-pink-400/10 to-transparent blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          </div>
          
          {/* Floating orbs */}
          {[...Array(8)].map((_, i) => (
            <div 
              key={i}
              className={`absolute w-${4 + (i % 3) * 2} h-${4 + (i % 3) * 2} bg-gradient-to-br from-purple-${400 + (i % 3) * 100}/20 to-pink-${400 + (i % 3) * 100}/20 rounded-full blur-xl animate-pulse`}
              style={{
                top: `${10 + (i * 10) % 80}%`,
                left: `${5 + (i * 15) % 90}%`,
                animationDelay: `${i * 0.5}s`,
                animationDuration: `${4 + (i % 3)}s`
              }}
            ></div>
          ))}
        </div>
        
        <div className="relative z-10">
          {content}
        </div>
      </div>
    );
  }

  return content;
};

export default LoadingSpinner;