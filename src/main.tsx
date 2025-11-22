import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { SuiProvider } from './sui/SuiProviders'
import './styles/index.css'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit'
import { getFullnodeUrl } from '@mysten/sui/client'

const { networkConfig } = createNetworkConfig({
  testnet: { url: getFullnodeUrl('testnet') },
})

const queryClient = new QueryClient()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork="testnet">
        <WalletProvider autoConnect={false} storage={null} enableUnsafeBurner={false}>
          <SuiProvider>
            <App />
          </SuiProvider>
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  </React.StrictMode>,
)