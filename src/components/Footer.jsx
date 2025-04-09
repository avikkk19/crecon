import { PcCaseIcon } from "lucide-react";
import React from "react";

const Footer = () => {
  return (
    <div className="">
      {/* Footer */}
      <footer className="bg-black text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-8">
            <div>
              <h3 className="text-white font-medium mb-4">Platform</h3>
              <ul className="space-y-2">
                <li>
                  <a href="" className="hover:text-white">
                    real time{" "}
                  </a>
                </li>
                <li>
                  <a href="" className="hover:text-white">
                    Management
                  </a>
                </li>
                <li>
                  <a href="" className="hover:text-white">
                    Evaluation
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-4">Integrations</h3>
              <ul className="space-y-2">
                <li>
                  <a href="" className="hover:text-white">
                    Supabase CLI
                  </a>
                </li>
                <li>
                  <a href="" className="hover:text-white">
                    React.js SDK{" "}
                  </a>
                </li>
                <li>
                <a
                  href="https://github.com/avikkk19/notyetnamed"
                  className=" hover:text-white"
                >
                  visit Github
                </a>
                </li>
                
              </ul>
            </div>

            {/* <div>
              <h3 className="text-white font-medium mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/" className="hover:text-white">
                    Documentation
                  </a>
                </li>
                <li>
                  <a href="/" className="hover:text-white">
                    Interactive Demo
                  </a>
                </li>
                <li>
                  <a href="/" className="hover:text-white">
                    Video demo (10 min)
                  </a>
                </li>
              </ul>
            </div> */}

            <div>
              <h3 className="text-white font-medium mb-4">About</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/blog" className="hover:text-white">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="/" className="hover:text-white">
                    Careers
                  </a>
                </li>
                <li>
                  <a
                    href="/abtdev
                  "
                    className="hover:text-white"
                  >
                    About dev
                  <p className="text-xs">--for some fun</p>{" "}
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="text-white font-medium mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/security" className="hover:text-white">
                    Security
                  </a>
                </li>
                <li>
                  <a href="/tandc" className="hover:text-white">
                    Terms and Conditions
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-8 border-t border-gray-800 text-sm">
            <p>© 2022-2025 Avinash</p>
            <p>
              Dev is a bit stubborn &&{" "}
              <a
                href="https://instagram.com/spidey33x_"
                className="hover:text-white"
              >
                spidey33x_{" "}
              </a>{" "}
              in case if you wanna conatct
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;
