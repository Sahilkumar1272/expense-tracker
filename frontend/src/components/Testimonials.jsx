import React from 'react';

const Testimonials = () => {
  const testimonials = [
    {
      name: "Sarah Johnson",
      role: "Freelancer",
      content: "This app completely changed how I manage my finances. The insights are incredible!",
      avatar: "👩‍💼"
    },
    {
      name: "Mike Chen",
      role: "Small Business Owner",
      content: "Simple, powerful, and exactly what I needed to track business expenses.",
      avatar: "👨‍💻"
    },
    {
      name: "Emily Rodriguez",
      role: "Student",
      content: "Finally, budgeting that actually works for my lifestyle. Love the visual reports!",
      avatar: "👩‍🎓"
    }
  ];

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            What Our Users Say
          </h2>
          <p className="text-xl text-gray-300">
            Real feedback from real users
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white/5 backdrop-blur-sm rounded-xl p-8 border border-white/10"
            >
              <div className="text-4xl mb-4">{testimonial.avatar}</div>
              <p className="text-gray-300 mb-6 italic">"{testimonial.content}"</p>
              <div>
                <h4 className="text-white font-semibold">{testimonial.name}</h4>
                <p className="text-gray-400 text-sm">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;