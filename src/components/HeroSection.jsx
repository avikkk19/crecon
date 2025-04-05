import React, { useState, useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const HeroSection = () => {
  const [selectedSection, setSelectedSection] = useState("chat");

  // Refs for elements to animate
  const heroContainerRef = useRef(null);
  const heroTitleRef = useRef(null);
  const heroSubtitleRef = useRef(null);
  const heroInputRef = useRef(null);
  const heroSignupRef = useRef(null);
  const useCasesSectionRef = useRef(null);
  const useCasesListRef = useRef(null);
  const useCaseContentRef = useRef(null);
  const openSourceSectionRef = useRef(null);
  const changelogRef = useRef(null);

  const useCases = {
    chat: {
      title: "Real-time Chat App",
      description: "Connect with experts in minutes",
      examples: [
        {
          prompt:
            "Find the latest talents with our open-source collaboration platforms",
          sources: 3,
          sourceLinks: [
            {
              name: "Uses edge functions along with Supabase",
              title: "Fast responses",
            },
            { name: "Low latency", title: "Fast updates" },
            { name: "File sharing", title: "Share any format of files" },
          ],
        },
      ],
    },
    blogs: {
      title: "Curated Blogs",
      description: "Get insights with blogs perfectly tailored to your needs",
      examples: [
        {
          prompt: "Create a blog about open projects",
          preview:
            "This week: New releases, trending projects, and community highlights",
        },
      ],
    },
    workflows: {
      title: "Manage Workflows",
      description: "Level up your work",
      examples: [
        {
          prompt:
            "Find experts to work on your projects and level up your work",
          summary: "Collaborate effectively with streamlined workflows.",
        },
      ],
    },
  };

  // GSAP Animations
  useEffect(() => {
    const tlLoad = gsap.timeline({ defaults: { ease: "power3.out" } });

    tlLoad
      .fromTo(
        heroTitleRef.current,
        { opacity: 0, y: 50 },
        { opacity: 1, y: 0, duration: 0.8, delay: 0.2 }
      )
      .fromTo(
        heroSubtitleRef.current,
        { opacity: 0, y: 40 },
        { opacity: 1, y: 0, duration: 0.7 },
        "-=0.5"
      )
      .fromTo(
        heroInputRef.current,
        { opacity: 0, y: 30 },
        { opacity: 1, y: 0, duration: 0.6 },
        "-=0.4"
      )
      .fromTo(
        heroSignupRef.current,
        { opacity: 0 },
        { opacity: 1, duration: 0.5 },
        "-=0.3"
      );

    return () => {
      tlLoad.kill(); // Clean up the animation on component unmount
    };
  }, []);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(useCasesSectionRef.current, {
        opacity: 0,
        y: 80,
        duration: 1,
        scrollTrigger: {
          trigger: useCasesSectionRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });

      gsap.from(".use-case-item", {
        opacity: 0,
        x: -50,
        duration: 0.6,
        stagger: 0.2,
        scrollTrigger: {
          trigger: useCasesListRef.current,
          start: "top 80%",
          toggleActions: "play none none none",
        },
      });

      gsap.from(openSourceSectionRef.current, {
        opacity: 0,
        y: 80,
        duration: 1,
        scrollTrigger: {
          trigger: openSourceSectionRef.current,
          start: "top 85%",
          toggleActions: "play none none none",
        },
      });

      gsap.from(".changelog-item", {
        opacity: 0,
        y: 30,
        duration: 0.5,
        stagger: 0.15,
        scrollTrigger: {
          trigger: changelogRef.current,
          start: "top 90%",
          toggleActions: "play none none none",
        },
      });
    }, heroContainerRef);

    return () => {
      ctx.revert();
    };
  }, []);

  useEffect(() => {
    if (useCaseContentRef.current) {
      gsap.fromTo(
        useCaseContentRef.current,
        { opacity: 0, y: 20 },
        { opacity: 1, y: 0, duration: 0.5, ease: "power2.inOut" }
      );
    }
  }, [selectedSection]);

  return (
    <div
      ref={heroContainerRef}
      className="bg-[radial-gradient(ellipse_at_center,_#0f172a_10%,_#042f2e_40%,_#000000_80%)]"
    >
      <div className="relative min-h-screen bg-opacity-50 text-white overflow-hidden backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-12 pb-24">
          <div className="text-center py-20">
            <h1
              ref={heroTitleRef}
              className="text-6xl sm:text-6xl font-bold mb-8 leading-tight tracking-tighter"
            >
              Simplify your
              <br />
              work with Cercon.
            </h1>
            <div ref={heroSubtitleRef} className="max-w-4xl mx-auto">
              <p className="text-2xl sm:text-2xl mb-6 hover:text-zinc-300 hover:underline decoration-4 decoration-zinc-600">
                Open-source platform that lets you hand off tasks to real
                experts,
                <br />
                so you can concentrate on what really matters.
              </p>
            </div>
            <div ref={heroInputRef} className="mt-10">
              <div className="max-w-3xl mx-auto bg-zinc-900 bg-opacity-50 rounded-full px-6 py-2 flex">
                <input
                  type="text"
                  placeholder="Type anything..."
                  className="bg-transparent text-white w-full outline-none"
                  aria-label="Search input"
                />
                <a href="/chat">
                  <button
                    className="text-gray-400 cursor-pointer"
                    aria-label="Submit search"
                  >
                    →
                  </button>
                </a>
              </div>
            </div>
            <p
              ref={heroSignupRef}
              className="justify-center align-center mt-12 text-sm font-mono"
            >
              * Sign up for full access *
            </p>
          </div>
        </div>

        {/* Use Cases Section */}
        <div
          ref={useCasesSectionRef}
          className="bg-transparent text-white pb-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="col-span-1">
                <div className="mb-6">
                  <button className="bg-gradient-to-bl from-green-900 to-blue-900 hover:bg-zinc-300 text-white px-6 py-3 rounded-full font-medium transition-colors border border-zinc-800 hover:border-gray-700">
                    Use cases
                  </button>
                </div>
                <h2 className="text-3xl font-bold mb-8 rounded-2xl hover:text-zinc-300">
                  Use Platform for:
                </h2>
                <div ref={useCasesListRef} className="space-y-6">
                  {Object.keys(useCases).map((key) => (
                    <div
                      key={key}
                      className={`p-4 rounded-4xl cursor-pointer use-case-item ${
                        selectedSection === key
                          ? "bg-black"
                          : "hover:border border-emerald-900"
                      }`}
                      onClick={() => setSelectedSection(key)}
                    >
                      <h3 className="font-bold text-xl mb-1">
                        {useCases[key].title}
                      </h3>
                      <p className="text-gray-400">
                        {useCases[key].description}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div
                ref={useCaseContentRef}
                className="col-span-1 md:col-span-2 bg-black rounded-4xl p-6"
              >
                {selectedSection === "chat" && (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center mb-3">
                        <span className="bg-zinc-900 p-2 rounded-full mr-3">
                          💬
                        </span>
                        <h3 className="text-xl font-bold">
                          Real-time Chat App
                        </h3>
                      </div>
                      <div className="bg-zinc-900 rounded-lg p-3 text-sm">
                        Find the latest talents with our open-source
                        collaboration platforms.
                      </div>
                      <div className="mt-4">
                        <p className="text-gray-400 mb-2">Key Features:</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          {useCases.chat.examples[0].sourceLinks.map(
                            (source, index) => (
                              <div
                                key={index}
                                className="bg-zinc-900 p-3 rounded-lg"
                              >
                                <p className="text-sm font-medium">
                                  {source.name}
                                </p>
                                <p className="text-xs text-gray-400">
                                  {source.title}
                                </p>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSection === "blogs" && (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center mb-3">
                        <span className="bg-zinc-900 p-2 rounded-full mr-3">
                          📰
                        </span>
                        <h3 className="text-xl font-medium">Curated Blogs</h3>
                      </div>
                      <div className="bg-zinc-900 rounded-lg p-3 text-sm">
                        Create a blog about open projects.
                      </div>
                      <div className="mt-4 bg-zinc-900 p-4 rounded-lg">
                        <h4 className="font-bold mb-2">Preview</h4>
                        <p className="text-sm">
                          {useCases.blogs.examples[0].preview}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {selectedSection === "workflows" && (
                  <div>
                    <div className="mb-6">
                      <div className="flex items-center mb-3">
                        <span className="bg-zinc-900 p-2 rounded-full mr-3">
                          📨
                        </span>
                        <h3 className="text-xl font-medium">
                          Manage Workflows
                        </h3>
                      </div>
                      <div className="bg-zinc-900 rounded-lg p-3 text-sm">
                        Find experts to work on your projects and level up your
                        work.
                      </div>
                      {useCases.workflows.examples[0].summary && (
                        <div className="mt-4 bg-zinc-900 p-4 rounded-lg">
                          <h4 className="font-bold mb-2">Best Results</h4>
                          <p className="text-sm">
                            {useCases.workflows.examples[0].summary}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Open Source Section */}
        <div
          ref={openSourceSectionRef}
          className="bg-transparent backdrop-blur-lg text-white py-20"
        >
          <div className="max-w-7xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <h2 className="text-5xl font-bold mb-4">Proudly Open Source</h2>
              <p className="text-xl mb-6">
                Committed to open source.
                <br />
                Trusted by few, used by none.
              </p>
              <a
                href="https://github.com/avikkk19/notyetnamed"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center bg-black hover:bg-zinc-900 text-white px-4 py-2 rounded-lg font-medium border border-gray-700 transition-colors"
              >
                <svg
                  className="w-5 h-5 mr-2"
                  fill="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.438 9.8 8.205 11.387.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.083-.73.083-.73 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.807 1.305 3.492.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 21.795 24 17.295 24 12c0-6.63-5.37-12-12-12z" />
                </svg>
                github.com/avikk19/notyetnamed
              </a>
            </div>

            <div
              ref={changelogRef}
              className="bg-black rounded-lg p-4 max-w-3xl mx-auto border border-zinc-900"
            >
              <div className="text-gray-300 text-sm mb-2">Changelog</div>
              <div className="space-y-4">
                <div className="flex items-start border-b border-zinc-900 pb-4 changelog-item">
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <span className="text-sm font-medium">Added blogs</span>
                      <span className="text-xs text-gray-400 ml-2">
                        by appalrvu
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">2 days ago</div>
                </div>

                <div className="flex items-start border-b border-zinc-900 pb-4 changelog-item">
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <span className="text-sm font-medium">
                        Integrated chats
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        by ballaldevah
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">2 days ago</div>
                </div>

                <div className="flex items-start border-b border-zinc-900 pb-4 changelog-item">
                  <div className="flex-grow">
                    <div className="flex items-center">
                      <span className="text-sm font-medium">
                        Debugged errors
                      </span>
                      <span className="text-xs text-gray-400 ml-2">
                        by kondaReddyyy
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">4 days ago</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;
