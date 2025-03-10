import React from "react";
import {
  AnimatedSpan,
  Terminal,
  TypingAnimation,
} from "./magicui/terminal";

// Component for the join course page with black and white color scheme
const JoinCoursePage = () => {
  // Course card component
  const CourseCard = ({ title, description, level, duration, price, tag }) => (
    <div className="bg-gray-900 rounded-xl p-6 transition-all hover:shadow-lg hover:shadow-white/20 hover:-translate-y-1">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-white">{title}</h3>
        <span className="px-2 py-1 text-xs rounded-full bg-white/20 text-white">{tag}</span>
      </div>
      <p className="text-gray-400 mb-6 text-sm">{description}</p>
      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="flex items-center">
          <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-gray-400 text-sm">{duration}</span>
        </div>
        <div className="flex items-center">
          <svg className="w-4 h-4 text-gray-500 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-gray-400 text-sm">{level}</span>
        </div>
      </div>
      <div className="flex justify-between items-center">
        <span className="text-white font-bold">{price}</span>
        <button className="bg-white text-black px-4 py-2 rounded-md hover:bg-gray-200 transition-colors">
          Enroll Now
        </button>
      </div>
    </div>
  );

  // Custom terminal component with course installation theme
  const CourseTerminal = () => (
    <div className="col-span-2 lg:col-span-3 row-span-1 lg:row-span-2">
      <div className="bg-gray-900 p-6 rounded-xl h-full flex flex-col">
        <h3 className="text-xl font-bold text-white mb-4">Get Started with Our Learning Platform</h3>
        <div className="flex-grow">
          <Terminal>
            <TypingAnimation>&gt; yr install course --development</TypingAnimation>
            <AnimatedSpan delay={1500} className="text-white">
              <span>✔ Analyzing your skill level.</span>
            </AnimatedSpan>
            <AnimatedSpan delay={2000} className="text-white">
              <span>✔ Customizing learning path.</span>
            </AnimatedSpan>
            <AnimatedSpan delay={2500} className="text-white">
              <span>✔ Validating prerequisites.</span>
            </AnimatedSpan>
            <AnimatedSpan delay={3000} className="text-white">
              <span>✔ Preparing course materials.</span>
            </AnimatedSpan>
            <AnimatedSpan delay={3500} className="text-white">
              <span>✔ Setting up coding environment.</span>
            </AnimatedSpan>
            <AnimatedSpan delay={4000} className="text-white">
              <span>✔ Initializing interactive exercises.</span>
            </AnimatedSpan>
            <AnimatedSpan delay={4500} className="text-white">
              <span>✔ Connecting to mentor network.</span>
            </AnimatedSpan>
            <AnimatedSpan delay={5000} className="text-white">
              <span>ℹ Course setup complete:</span>
              <span className="pl-2">- All resources accessible via dashboard</span>
            </AnimatedSpan>
            <TypingAnimation delay={5500} className="text-gray-400">
              Welcome aboard! Your learning journey is ready to begin.
            </TypingAnimation>
            <TypingAnimation delay={6000} className="text-gray-400">
              Start with your first module now or schedule for later.
            </TypingAnimation>
          </Terminal>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-black text-white pt-20 pb-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="text-white font-semibold">ELEVATE YOUR SKILLS</span>
          <h1 className="text-4xl md:text-5xl font-bold mt-2 mb-4">Join Our Premium Courses</h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Take your career to the next level with our industry-leading courses. 
            Learn from experts and gain hands-on experience.
          </p>
        </div>

        {/* Bento Grid Layout with Terminal and Courses */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Terminal Demo */}
          <CourseTerminal />

          {/* Featured Courses */}
          <div className="col-span-1 row-span-1">
            <CourseCard 
              title="Web Development Bootcamp" 
              description="Learn full-stack web development from scratch with React, Node.js, and MongoDB."
              level="Intermediate"
              duration="12 weeks"
              price="@4999"
              tag="Bestseller"
            />
          </div>
          
          <div className="col-span-1 row-span-1">
            <CourseCard 
              title="AI & Machine Learning" 
              description="Master the fundamentals of AI, neural networks, and practical ML model deployment."
              level="Advanced"
              duration="10 weeks"
              price="@5999"
              tag="New"
            />
          </div>
          
          <div className="col-span-1 row-span-1">
            <CourseCard 
              title="UI/UX Design Masterclass" 
              description="Create stunning interfaces and learn user experience principles for modern applications."
              level="Beginner"
              duration="8 weeks"
              price="@3999"
              tag="Popular"
            />
          </div>
          
          {/* Stats Section */}
          <div className="col-span-1 lg:col-span-2 bg-gray-900 rounded-xl p-6">
            <h3 className="text-xl font-bold text-white mb-4">Why Choose Us</h3>
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <div className="text-white text-3xl font-bold mb-2">97%</div>
                <div className="text-gray-400 text-sm">Job Placement Rate</div>
              </div>
              <div className="text-center">
                <div className="text-white text-3xl font-bold mb-2">15k+</div>
                <div className="text-gray-400 text-sm">Active Students</div>
              </div>
              <div className="text-center">
                <div className="text-white text-3xl font-bold mb-2">50+</div>
                <div className="text-gray-400 text-sm">Industry Partners</div>
              </div>
              <div className="text-center">
                <div className="text-white text-3xl font-bold mb-2">4.9</div>
                <div className="text-gray-400 text-sm">Average Rating</div>
              </div>
            </div>
                <h1 className=" mt-3.5 justify-center flex font-bold">All fake data btw, example usage</h1>
          </div>
          
          {/* CTA Section */}
          <div className="col-span-1 lg:col-span-2 bg-gradient-to-r from-gray-900 to-black rounded-xl p-6 flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white mb-4">Ready to Transform Your Career?</h3>
              <p className="text-gray-300 mb-6">
                Join thousands of successful professionals who have upgraded their skills with our courses.
              </p>
            </div>
            <button className="bg-white text-black px-6 py-3 rounded-md hover:bg-gray-200 transition-colors w-full sm:w-auto">
              Browse All Courses
            </button>
          </div>
        </div>
        
        {/* Testimonial */}
        {/* <div className="mt-16 text-center">
          <div className="max-w-3xl mx-auto bg-gray-900/50 p-8 rounded-xl">
            <div className="text-white text-2xl mb-4">★★★★★</div>
            <p className="text-lg text-gray-300 italic mb-6">
              "This platform completely changed my career trajectory. Within three months of completing the Web Development Bootcamp, I landed a job that doubled my previous salary."
            </p>
            <div className="flex items-center justify-center">
              <div className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center mr-3">
                JD
              </div>
              <div className="text-left">
                <div className="font-medium">Jane Doe</div>
                <div className="text-sm text-gray-400">Software Engineer at Google</div>
              </div>
            </div>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default JoinCoursePage;