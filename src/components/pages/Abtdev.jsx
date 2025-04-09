import { useEffect, useRef } from "react";
import gsap from "gsap";

function Abtdev() {
  const headingRef = useRef(null);
  const paragraphRef = useRef(null);
  const containerRef = useRef(null);
  const specialWords = useRef([]);
  const developerRef = useRef(null);
  const weirdlyRef = useRef(null);

  useEffect(() => {
    // Make sure everything is visible initially
    gsap.set(paragraphRef.current, { opacity: 1, y: 0 });

    // Initialize animations when component mounts
    const tl = gsap.timeline({ defaults: { ease: "power2.out" } });

    // Create our own simple text split for the heading
    const headingElement = headingRef.current;
    if (!headingElement) return; // Safety check

    const headingText = headingElement.innerText;
    headingElement.innerHTML = "";

    // Create individual span elements for each character
    const chars = [];
    for (let i = 0; i < headingText.length; i++) {
      const charSpan = document.createElement("span");
      charSpan.textContent = headingText[i];
      charSpan.style.display = "inline-block";
      headingElement.appendChild(charSpan);
      chars.push(charSpan);
    }

    // Animate each character
    chars.forEach((char, index) => {
      gsap.from(char, {
        opacity: 0,
        y: 20,
        duration: 0.1,
        delay: index * 0.05,
      });
    });

    // Special words hover effects
    specialWords.current.forEach((word) => {
      if (!word) return; // Safety check

      word.addEventListener("mouseenter", () => {
        gsap.to(word, {
          scale: 1.2,
          duration: 0.3,
        });
      });

      word.addEventListener("mouseleave", () => {
        gsap.to(word, {
          scale: 1,
          duration: 0.3,
        });
      });
    });

    // Developer word animation - glowing pulse
    if (developerRef.current) {
      const developerElement = developerRef.current;
      developerElement.addEventListener("mouseenter", () => {
        gsap.to(developerElement, {
          color: "#64ffda",
          textShadow: "0 0 8px #64ffda",
          fontWeight: "bold",
          duration: 0.4,
        });
      });

      developerElement.addEventListener("mouseleave", () => {
        gsap.to(developerElement, {
          color: "white",
          textShadow: "none",
          fontWeight: "normal",
          duration: 0.4,
        });
      });
    }

    // Weirdly word zigzag animation
    if (weirdlyRef.current) {
      const weirdlyElement = weirdlyRef.current;

      weirdlyElement.addEventListener("mouseenter", () => {
        // Stop any existing animations
        gsap.killTweensOf(weirdlyElement);

        // Zigzag animation
        gsap.to(weirdlyElement, {
          keyframes: [
            { x: -3, y: -3, rotation: 3, duration: 0.1 },
            { x: 3, y: 3, rotation: -3, duration: 0.1 },
            { x: -3, y: 3, rotation: -3, duration: 0.1 },
            { x: 3, y: -3, rotation: 3, duration: 0.1 },
            { x: 0, y: 0, rotation: 0, duration: 0.1 },
          ],
          repeat: 2,
          ease: "none",
        });
      });
    }

    // Background subtle animation
    gsap.to(containerRef.current, {
      backgroundPosition: "100% 100%",
      duration: 15,
      repeat: -1,
      yoyo: true,
    });

    return () => {
      tl.kill();
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className="bg-[radial-gradient(ellipse_at_center,_#0f172a_10%,_#042f2e_40%,_#000000_80%)]"
      style={{ backgroundSize: "200% 200%", backgroundPosition: "0% 0%" }}
    >
      <div className="relative min-h-screen text-white overflow-hidden backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-60 flex flex-col items-center justify-center h-full">
          <h1 ref={headingRef} className="text-4xl font-mono mb-8">
            About&nbsp;the&nbsp;dev.
          </h1>
          <p ref={paragraphRef} className="font-mono m-2 p-4 md:w-1/2">
            Hey, I'm a curious web{" "}
            <span ref={developerRef} className="cursor-pointer inline-block">
              Developer
            </span>{" "}
            who{" "}
            <span
              ref={(el) => specialWords.current.push(el)}
              className="hover:text-pink-500 cursor-grab inline-block"
            >
              loves
            </span>{" "}
            experimenting with ideas. I blend creativity with code to build
            clean, useful, and sometimes {""}
            <span
              ref={weirdlyRef}
              className="hover:text-teal-700 cursor-pointer inline-block"
            >
              weirdly
            </span>{" "}
            cool websites. Always exploring new tools, better UI, and smoother
            UX. If it makes someone pause and say{" "}
            <span
              ref={(el) => specialWords.current.push(el)}
              className="hover:text-indigo-500 cursor-crosshair inline-block"
            >
              "whoa"
            </span>{" "}
            — mission accomplished.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Abtdev;
