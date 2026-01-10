'use client'
import { Archive, BookOpen, Home, User, Settings, LogOut, LogIn, UserPlus, CodeXml, Menu, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion'
import Image from 'next/image'
import { useAuth } from '../context/authContext'
import axios from 'axios'

const NavBar = () => {
  const { isAuthenticated, checkAuth } = useAuth()
  const router = useRouter()
  const [isScrolled, setIsScrolled] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const mouseX = useMotionValue(Infinity)

  useEffect(() => {
    setIsMounted(true)
    
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [isMobileMenuOpen])

  const handleLogout = async () => {
  try {
    await axios.post(
      `${process.env.NEXT_PUBLIC_API_URL}/user/logout`,
      {},
      { withCredentials: true }
    );
    
    await checkAuth();
    setIsMobileMenuOpen(false);
    router.replace("/");
  } catch (error) {
    console.error('Logout error:', error);
    setIsMobileMenuOpen(false);
    router.replace("/");
  }
};

  const getNavItems = () => {
    if (!isAuthenticated) {
      return [
        { icon: Home, label: 'Home', onClick: () => router.push('/') },
        { icon: BookOpen, label: 'About', onClick: () => router.push('/about') },
        { icon: LogIn, label: 'Sign In', onClick: () => router.push('/login') },
        { icon: UserPlus, label: 'Register', onClick: () => router.push('/register') },
      ]
    }

   else {
      return [
        { icon: Home, label: 'Dashboard', onClick: () => router.push('/dashboard') },
        { icon: User, label: 'Profile', onClick: () => router.push('/profile') },
        { icon: LogOut, label: 'Logout', onClick: handleLogout },
      ]
    }

    return []
  }

  const navItems = getNavItems()

  return (
    <>
      <nav className="fixed top-3 left-0 right-0 z-50 px-2 sm:px-4" style={{ padding: isScrolled ? '0.15rem 0.5rem' : '0.5rem 0.5rem' }}>
        <motion.div 
          className="mx-auto"
          animate={{
            maxWidth: isScrolled ? '48rem' : '80rem'
          }}
          transition={isMounted ? { duration: 0.4, ease: 'easeInOut' } : { duration: 0 }}
        >
          <motion.div
            animate={{
              backgroundColor: isScrolled ? 'rgba(0, 0, 0, 0.8)' : 'rgba(0, 0, 0, 0)',
              borderRadius: isScrolled ? '9999px' : '0px',
              backdropFilter: isScrolled ? 'blur(20px)' : 'blur(0px)',
              paddingLeft: isScrolled ? '0.75rem' : '1.25rem',
              paddingRight: isScrolled ? '0.75rem' : '1.25rem',
              paddingTop: isScrolled ? '0.35rem' : '0.5rem',
              paddingBottom: isScrolled ? '0.35rem' : '0.5rem',
            }}
            transition={isMounted ? { duration: 0.4, ease: 'easeInOut' } : { duration: 0 }}
            className={`flex items-center justify-between ${
              isScrolled ? 'border border-white/10 shadow-2xl' : ''
            }`}
          >
            <motion.div
              animate={{ 
                scale: isScrolled ? 0.8 : 1,
              }}
              transition={isMounted ? { duration: 0.3, ease: 'easeInOut' } : { duration: 0 }}
            >
              <Link href="/" className="flex items-center space-x-2">
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  animate={{
                    padding: isScrolled ? '0.25rem' : '0.35rem'
                  }}
                  transition={isMounted ? { duration: 0.3 } : { duration: 0 }}
                  className="backdrop-blur-sm rounded-lg"
                >
                  <Image 
                    src={'/assets/logo2.jpeg'} 
                    className='rounded-md' 
                    width={isScrolled ? 60 : 80} 
                    height={isScrolled ? 35 : 45} 
                    alt='logo'
                  />
                </motion.div>
              </Link>
            </motion.div>

            <motion.div
              onMouseMove={(e) => mouseX.set(e.pageX)}
              onMouseLeave={() => {
                mouseX.set(Infinity)
                setHoveredIndex(null)
              }}
              animate={{ 
                scale: isScrolled ? 0.9 : 1,
                gap: isScrolled ? '0.25rem' : '0.375rem'
              }}
              transition={isMounted ? { duration: 0.3, ease: 'easeInOut' } : { duration: 0 }}
              className="hidden md:flex items-center"
              style={{ gap: isScrolled ? '0.25rem' : '0.375rem' }}
            >
              {navItems.map((item, index) => (
                <NavItem
                  key={index}
                  item={item}
                  index={index}
                  mouseX={mouseX}
                  isHovered={hoveredIndex === index}
                  setHoveredIndex={setHoveredIndex}
                  isScrolled={isScrolled}
                  isMounted={isMounted}
                />
              ))}
            </motion.div>

            <motion.button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              animate={{
                scale: isScrolled ? 0.9 : 1,
              }}
              transition={isMounted ? { duration: 0.3 } : { duration: 0 }}
              className="md:hidden flex items-center justify-center w-10 h-10 bg-white/5 backdrop-blur-sm rounded-full border border-white/10 hover:bg-white/10 transition-colors"
            >
              {isMobileMenuOpen ? (
                <X className="w-5 h-5 text-white/80" />
              ) : (
                <Menu className="w-5 h-5 text-white/80" />
              )}
            </motion.button>
          </motion.div>
        </motion.div>
      </nav>

      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />

            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-64 sm:w-80 bg-black/95 backdrop-blur-xl border-l border-white/10 z-50 md:hidden"
            >
              <div className="flex flex-col h-full">
                <div className="flex items-center justify-between p-6 border-b border-white/10">
                  <h2 className="text-white text-lg font-semibold">Menu</h2>
                  <button
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="w-8 h-8 flex items-center justify-center bg-white/5 rounded-full border border-white/10 hover:bg-white/10 transition-colors"
                  >
                    <X className="w-4 h-4 text-white/80" />
                  </button>
                </div>

                <div className="flex flex-col p-4 space-y-2 overflow-y-auto">
                  {navItems.map((item, index) => (
                    <MobileNavItem
                      key={index}
                      item={item}
                      index={index}
                      onClose={() => setIsMobileMenuOpen(false)}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

type NavItemProps = {
  item: {
    icon: any
    label: string
    onClick: () => void
  }
  index: number
  mouseX: any
  isHovered: boolean
  setHoveredIndex: (index: number | null) => void
  isScrolled: boolean
  isMounted: boolean
}

const NavItem = ({ item, index, mouseX, isHovered, setHoveredIndex, isScrolled, isMounted }: NavItemProps) => {
  const ref = useRef<HTMLButtonElement>(null)
  const Icon = item.icon

  const distance = useTransform(mouseX, (val: number) => {
    const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
    return val - bounds.x - bounds.width / 2
  })

  const widthSync = useTransform(distance, [-150, 0, 150], [
    isScrolled ? 36 : 42, 
    isScrolled ? 48 : 60, 
    isScrolled ? 36 : 42
  ])
  const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 })

  return (
    <motion.button
      ref={ref}
      onClick={item.onClick}
      onMouseEnter={() => setHoveredIndex(index)}
      onMouseLeave={() => setHoveredIndex(null)}
      style={{ width }}
      animate={{
        height: isScrolled ? '2rem' : '2.5rem'
      }}
      transition={isMounted ? { duration: 0.3 } : { duration: 0 }}
      className="relative flex items-center justify-center bg-white/5 backdrop-blur-sm rounded-full border border-white/10 hover:bg-white/10 transition-colors duration-200 group"
    >
      <Icon className={`text-white/80 group-hover:text-white transition-all duration-300 ${
        isScrolled ? 'w-3.5 h-3.5' : 'w-4 h-4'
      }`} />
      
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 10 }}
          className="absolute -bottom-10 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-black/80 backdrop-blur-md text-white text-xs rounded-lg border border-white/20 whitespace-nowrap pointer-events-none"
        >
          {item.label}
        </motion.div>
      )}
    </motion.button>
  )
}

type MobileNavItemProps = {
  item: {
    icon: any
    label: string
    onClick: () => void
  }
  index: number
  onClose: () => void
}

const MobileNavItem = ({ item, index, onClose }: MobileNavItemProps) => {
  const Icon = item.icon

  const handleClick = () => {
    item.onClick()
    onClose()
  }

  return (
    <motion.button
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05 }}
      onClick={handleClick}
      className="flex items-center space-x-4 p-4 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 hover:bg-white/10 transition-all duration-200 group"
    >
      <div className="flex items-center justify-center w-10 h-10 bg-white/5 rounded-full border border-white/10 group-hover:border-white/20 transition-colors">
        <Icon className="w-5 h-5 text-white/80 group-hover:text-white transition-colors" />
      </div>
      <span className="text-white/80 group-hover:text-white font-medium transition-colors">
        {item.label}
      </span>
    </motion.button>
  )
}

export default NavBar