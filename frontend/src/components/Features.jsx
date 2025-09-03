import React from 'react';

const Features = () => {
  const features = [
    {
      icon: '🎯',
      title: 'Smart Categorization',
      description: 'Automatically categorize your expenses using AI-powered recognition'
    },
    {
      icon: '📈',
      title: 'Visual Analytics',
      description: 'Beautiful charts and graphs to understand your spending patterns'
    },
    {
      icon: '🔒',
      title: 'Bank-Level Security',
      description: 'Your financial data is protected with enterprise-grade encryption'
    },
    {
      icon: '📱',
      title: 'Multi-Device Sync',
      description: 'Access your data seamlessly across all your devices'
    },
    {
      icon: '🎨',
      title: 'Custom Budgets',
      description: 'Create personalized budgets that fit your lifestyle'
    },
    {
      icon: '📊',
      title: 'Detailed Reports',
      description: 'Generate comprehensive reports for better financial planning'
    }
  ];

  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Powerful Features for 
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Smart Tracking</span>
          </h2>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            Everything you need to take control of your finances in one beautiful, easy-to-use platform
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10 hover:border-purple-400/50 transition-all duration-300 group hover:transform hover:scale-105"
            >
              <div className="text-4xl mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-4">
                {feature.title}
              </h3>
              <p className="text-gray-300 leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;