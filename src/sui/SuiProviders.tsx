import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface SuiContextType {
  account: string | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
}

const SuiContext = createContext<SuiContextType | undefined>(undefined)

export const useSui = () => {
  const context = useContext(SuiContext)
  if (!context) {
    throw new Error('useSui must be used within SuiProvider')
  }
  return context
}

interface SuiProviderProps {
  children: ReactNode
}

export const SuiProvider = ({ children }: SuiProviderProps) => {
  const [account, setAccount] = useState<string | null>(null)
  const [isConnected, setIsConnected] = useState(false)

  const connect = async () => {
    try {
      // Check if Sui wallet is installed
      if (typeof window !== 'undefined' && (window as any).suiWallet) {
        const wallet = (window as any).suiWallet
        const accounts = await wallet.requestPermissions()
        
        if (accounts && accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
          console.log('Connected to Sui wallet:', accounts[0])
        }
      } else {
        // For development/testing without wallet
        console.log('Sui Wallet not detected. Using mock connection.')
        const mockAddress = '0x' + Math.random().toString(16).substring(2, 42)
        setAccount(mockAddress)
        setIsConnected(true)
        alert('Demo Mode: Sui wallet not detected. Using mock connection for testing.')
      }
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    }
  }

  const disconnect = () => {
    setAccount(null)
    setIsConnected(false)
  }

  return (
    <SuiContext.Provider value={{ account, isConnected, connect, disconnect }}>
      {children}
    </SuiContext.Provider>
  )
}