import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import {
  useConnectWallet,
  useCurrentAccount,
  useCurrentWallet,
  useDisconnectWallet,
  useWallets,
} from '@mysten/dapp-kit'

interface SuiContextType {
  account: string | null
  isConnected: boolean
  connect: () => Promise<void>
  disconnect: () => void
  wallet: any | null
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
  const currentAccount = useCurrentAccount()
  const { currentWallet, connectionStatus } = useCurrentWallet()
  const wallets = useWallets()
  const { mutateAsync: connectWallet } = useConnectWallet()
  const { mutateAsync: disconnectWallet } = useDisconnectWallet()

  const account = currentAccount?.address ?? null
  const isConnected = connectionStatus === 'connected'

  const connect = async () => {
    try {
      if (!wallets.length) {
        alert('No Sui wallet detected. Please install Slush or another Sui wallet.')
        return
      }

      // Connect to the first available wallet (e.g., Slush)
      await connectWallet({ wallet: wallets[0] })
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      alert('Failed to connect wallet. Please try again.')
    }
  }

  const disconnect = async () => {
    try {
      await disconnectWallet()
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
    }
  }

  return (
    <SuiContext.Provider value={{ account, isConnected, connect, disconnect, wallet: currentWallet }}>
      {children}
    </SuiContext.Provider>
  )
}