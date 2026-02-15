"use client";

import FloatingLines from "./components/background"
import Link from "next/link"
import TextType from "./components/textType"
import { featuresData } from './data/FeatureData';
import { FeatureCard } from "./components/FeatureCard";
import StarBorder from './components/starBorder';
import { useAuth } from "./context/authContext";
export default function Home() {

  const {isAuthenticated}=useAuth();
  return (
    <>
      <div className="relative min-h-screen w-full flex flex-col items-center justify-center bg-black text-white overflow-hidden">
        <div className="absolute inset-0 z-0">
          <FloatingLines 
            enabledWaves={['top', 'middle', 'bottom']}
            lineCount={[2, 4, 8]}
            lineDistance={[8, 6, 4]}
            bendRadius={5.0}
            bendStrength={-0.5}
            interactive={true}
            parallax={true}
          />
        </div>

        <div className="pt-10 sm:pt-20 md:pt-25 relative z-10 flex flex-col items-center gap-y-8 sm:gap-y-12 px-4 w-full">
          <div className="flex flex-col items-center gap-y-4 sm:gap-y-6 w-full">
            <div className="text-center w-full">
              <TextType 
                text={["Welcome to all new coding editor", "FORGE"]}
                typingSpeed={45}
                pauseDuration={2000}
                showCursor={true}
                cursorCharacter="_"
                className="text-3xl sm:text-5xl md:text-6xl lg:text-8xl   px-2"
                loop={false}
              />
            </div>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-center max-w-xs sm:max-w-md md:max-w-2xl px-4">
              A simple place to write, run, and build code.
            </p>
          </div>

          {!isAuthenticated?<div className="flex flex-col sm:flex-row gap-4 sm:gap-6 w-full sm:w-auto px-4">
            <Link href="/signup" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto text-base sm:text-lg md:text-xl rounded-full px-8 sm:px-10 py-2.5 sm:py-3 font-semibold transition-all duration-300 transform hover:scale-105 bg-black ">
                Sign Up
              </button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto text-base sm:text-lg md:text-xl rounded-full px-8 sm:px-10 py-2.5 sm:py-3 font-semibold transition-all duration-300 transform hover:scale-105 border-2 border-gray-500">
                Login
              </button>
            </Link>
          </div>
        :<div><Link href="/dashboard" className="w-full sm:w-auto">
              <button className="w-full sm:w-auto text-base sm:text-lg md:text-xl rounded-full px-8 sm:px-10 py-2.5 sm:py-3 font-semibold transition-all duration-300 transform hover:scale-105 bg-black ">
                Get Started
              </button>
            </Link></div>}
</div>
        <div className="absolute bottom-6 sm:bottom-10 z-10 animate-bounce">
          <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" viewBox="0 0 24 24" stroke="currentColor">
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>

      <div className="min-h-screen w-full bg-black text-white py-12 sm:py-16 md:py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 sm:mb-16 md:mb-20">
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-7xl   mb-3 sm:mb-4">What We Offer</h2>
            <p className="text-base sm:text-lg md:text-xl text-gray-400 px-4">Everything you need to code efficiently</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 md:gap-8">
  {featuresData.map((feature) => (
    <FeatureCard
      key={feature.id}
      title={feature.title}
      icon={feature.icon}
      description={feature.description}
    />
  ))}
</div>


          <div className="text-center mt-12 sm:mt-16 md:mt-20 px-4">
            <h3 className="text-2xl sm:text-3xl md:text-4xl   mb-4 sm:mb-6">Ready to start coding?</h3>
            <Link href="/signup">
            <StarBorder className="text-base border border-gray-700 sm:text-lg md:text-xl rounded-full px-8 sm:px-10 md:px-12 py-3 sm:py-3.5 md:py-4 font-semibold transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-purple-500/50"
            as="div"
      color="magenta"
      speed="5s"
            >
                Get Started Free
              </StarBorder>
            </Link>
          </div>
        </div>
      </div>

      <footer className="bg-black text-gray-400 py-8 sm:py-10 px-4 border-t border-zinc-800">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-base sm:text-lg   text-white mb-2">Forge</p>
          <p className="text-xs sm:text-sm"> 2024 Forge. All rights reserved.</p>
          <div className="mt-3 sm:mt-4 flex flex-wrap justify-center gap-4 sm:gap-6">
            <a href="#" className="hover:text-purple-400 transition-colors text-sm sm:text-base">Terms</a>
            <a href="#" className="hover:text-purple-400 transition-colors text-sm sm:text-base">Privacy</a>
            <a href="#" className="hover:text-purple-400 transition-colors text-sm sm:text-base">Contact</a>
          </div>
        </div>
      </footer>
    </>
  )
}