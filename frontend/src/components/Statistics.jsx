import React from 'react';

const Statistics = () => {
  const stats = [
    { number: '50K+', label: 'Happy Users' },
    { number: '$2M+', label: 'Money Tracked' },
    { number: '99.9%', label: 'Uptime' },
    { number: '4.9★', label: 'User Rating' }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="bg-gradient-to-r from-purple-500/10 to-pink-500/10 rounded-2xl p-12 backdrop-blur-sm border border-white/10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
              Trusted by Thousands
            </h2>
            <p className="text-xl text-gray-300">
              Join our growing community of smart money managers
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <div key={index} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stat.number}
                </div>
                <div className="text-gray-300">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Statistics;