import React from 'react';
import { Link } from 'react-router-dom';

const CTA = () => {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto text-center">
        <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-2xl p-12 backdrop-blur-sm border border-white/10">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            Ready to Transform Your 
            <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Financial Life?</span>
          </h2>
          
          <p className="text-xl text-gray-300 mb-8">
            Join thousands of users who have already taken control of their finances
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              to="/register"
              className="bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:from-purple-600 hover:to-pink-600 transition-all transform hover:scale-105 shadow-lg"
            >
              Get Started Free
            </Link>
            <Link
              to="/login"
              className="border border-white/30 text-white px-8 py-4 rounded-lg text-lg font-semibold hover:bg-white/10 transition-all"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CTA;