import { createContext, useContext, useState } from 'react'
import UpgradeModal from '../components/UpgradeModal'

const UpgradeModalContext = createContext(null)

export function UpgradeModalProvider({ children }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <UpgradeModalContext.Provider value={{ openUpgradeModal: () => setIsOpen(true) }}>
      {children}
      <UpgradeModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </UpgradeModalContext.Provider>
  )
}

export const useUpgradeModal = () => useContext(UpgradeModalContext)
