import React from 'react'

const Footer = () => {
  return (
    <div className="">
         {/* Footer */}
      <footer className="bg-black text-gray-400 py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8">
            <div>
              <h3 className="text-white font-medium mb-4">Platform</h3>
              <ul className="space-y-2">
                <li><a href="/tracing" className="hover:text-white">real time </a></li>
                <li><a href="/prompt-management" className="hover:text-white">Management</a></li>
                <li><a href="/evaluation" className="hover:text-white">Evaluation</a></li>
             
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-medium mb-4">Integrations</h3>
              <ul className="space-y-2">
                <li><a href="/python-sdk" className="hover:text-white">Python SDK</a></li>
                <li><a href="/js-sdk" className="hover:text-white">JS/TS SDK</a></li>
                <li><a href="/openai-sdk" className="hover:text-white">anthropic</a></li>
              
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-medium mb-4">Resources</h3>
              <ul className="space-y-2">
                <li><a href="/docs" className="hover:text-white">Documentation</a></li>
                <li><a href="/interactive-demo" className="hover:text-white">Interactive Demo</a></li>
                <li><a href="/video-demo" className="hover:text-white">Video demo (10 min)</a></li>
                
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-medium mb-4">About</h3>
              <ul className="space-y-2">
                <li><a href="/blog" className="hover:text-white">Blog</a></li>
                <li><a href="/careers" className="hover:text-white">Careers</a></li>
                <li><a href="/about-us" className="hover:text-white">About us</a></li>
                
              </ul>
            </div>
            
            <div>
              <h3 className="text-white font-medium mb-4">Legal</h3>
              <ul className="space-y-2">
                <li><a href="/security" className="hover:text-white">Security</a></li>
                <li><a href="/terms" className="hover:text-white">Terms</a></li>
                <li><a href="/privacy" className="hover:text-white">Privacy</a></li>
              </ul>
            </div>
          </div>
          
          <div className="mt-12 pt-8 border-t border-gray-800 text-sm">
            <p>© 2022-2025 avinash, viggu Inc.</p>
          </div>
        </div>
      </footer>
      
      {/* Navigation and additional elements can be added as needed */}
      <div className="fixed bottom-6 right-6">
       <a href="">
       <div className="bg-gray-800 rounded-full p-3 flex items-center shadow-lg">
          <span className="mr-2">Chat</span>
          <span className="text-purple-500">💬</span>
        </div>
       </a>
      </div>
    </div>
  )
}

export default Footer