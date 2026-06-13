import { createContext, useContext, useEffect, useState } from 'react'

const ThemeContext = createContext(null)

const DARK_BG = '#0F0C29'
const LIGHT_BG = '#F0F2F7'

export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('voxofied-dark') === 'true'
  )

  useEffect(() => {
    localStorage.setItem('voxofied-dark', darkMode)
    applyTheme(darkMode)
  }, [darkMode])

  // Apply immediately on first paint (no flash)
  applyTheme(darkMode)

  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

function applyTheme(dark) {
  if (dark) {
    document.documentElement.classList.add('dark')
    document.body.style.backgroundColor = DARK_BG
  } else {
    document.documentElement.classList.remove('dark')
    document.body.style.backgroundColor = LIGHT_BG
  }
}

export const useTheme = () => useContext(ThemeContext)
