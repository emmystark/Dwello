import { useState } from 'react';
import LocationSelector from './components/LocationSelector';
import PropertyList from './components/PropertyList';
import './styles/App.css';
import {suiClient} from './walrus/client.ts'

// ──────────────────────────────────────────────────────────────
// Official Sui dApp Kit (2025) – Wallet + QueryClient
// ──────────────────────────────────────────────────────────────
import {
  SuiClientProvider,
  WalletProvider,
  ConnectButton,        // ← Beautiful, responsive, official wallet button
} from '@mysten/dapp-kit';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getFullnodeUrl } from '@mysten/sui/client';
import '@mysten/dapp-kit/dist/index.css';

// Required for React Query (fixes the "No QueryClient" error)
const queryClient = new QueryClient();

interface Location {
  country?: string;
  state?: string;
  city?: string;
}

function AppContent() {
  const [selectedLocation, setSelectedLocation] = useState<Location>({});

  const handleLocationSelect = (location: Location) => {
    setSelectedLocation(location);
  };

  return (
    <div className="app">
      {/* ==================== HEADER ==================== */}
      <header className="app-header">
        <div className="header-content">
          <h1>Dwello</h1>
          <p className="header-subtitle">Powered by Sui & Walrus</p>
        </div>

        {/* ←←← OFFICIAL RESPONSIVE CONNECT BUTTON */}
        <ConnectButton />
      </header>

      {/* ==================== MAIN CONTENT ==================== */}
      <main className="app-main">
        {/* Show big connect button if not connected */}
        {!window.__SUI_WALLET_CONNECTED__ && (
          <div className="connect-prompt">
            <div className="prompt-icon">🔐</div>
            <h2>Connect Your Sui Wallet</h2>
            <p>Connect your wallet to start exploring properties worldwide</p>
            <p className="prompt-subtext">Secure blockchain-verified real estate listings</p>
            <ConnectButton className="connect-btn-large" />
          </div>
        )}

        {/* Show the app when wallet is connected */}
        {window.__SUI_WALLET_CONNECTED__ && (
          <>
            <LocationSelector
              onLocationSelect={handleLocationSelect}
              selectedLocation={selectedLocation}
            />
            {(selectedLocation?.city || selectedLocation?.state) && (
              <PropertyList location={selectedLocation} />
            )}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Built on Sui Network • Data stored on Walrus</p>
      </footer>
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Root App with all required providers
// ──────────────────────────────────────────────────────────────
export const networks = {
  testnet: { url: getFullnodeUrl('testnet') },
};
export default function App() {

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networks} defaultNetwork="testnet">
        <WalletProvider autoConnect>
          <AppContent />
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
}