import { useEffect, useState } from 'react';
// import { useSignAndExecuteTransactionBlock } from '@mysten/dapp-kit';
import { SuiClient } from '@mysten/sui.js/client';
import { useSui } from '../sui/SuiProviders';

interface WalletBalanceProps {
  showAddress?: boolean;
}

const WalletBalance = ({ showAddress = true }: WalletBalanceProps) => {
  const { account } = useSui();
  const [balance, setBalance] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!account) {
      setBalance(null);
      return;
    }

    const fetchBalance = async () => {
      try {
        setLoading(true);
        // Use testnet RPC endpoint
        const client = new SuiClient({ url: 'https://fullnode.testnet.sui.io:443' });
        
        // Get all coins for the account
        const coins = await client.getCoins({
          owner: account,
        });

        // Calculate total balance
        let totalBalance = 0n;
        for (const coin of coins.data) {
          totalBalance += BigInt(coin.balance);
        }

        // Convert from smallest unit (1 SUI = 10^9 MIST) to SUI
        const suiBalance = Number(totalBalance) / 1e9;
        setBalance(suiBalance.toFixed(4));
      } catch (error) {
        console.error('Error fetching balance:', error);
        setBalance(null);
      } finally {
        setLoading(false);
      }
    };

    // Fetch balance on mount and every 10 seconds
    fetchBalance();
    const interval = setInterval(fetchBalance, 10000);

    return () => clearInterval(interval);
  }, [account]);

  if (!account) {
    return null;
  }

  const shortAddress = `${account.substring(0, 6)}...${account.substring(account.length - 4)}`;

  return (
    <div className="wallet-balance-container">
      {showAddress && (
        <div className="wallet-address">
          <span className="label">Wallet:</span>
          <span className="address" title={account}>
            {shortAddress}
          </span>
        </div>
      )}
      <div className="wallet-balance">
        <span className="label">Balance:</span>
        {loading ? (
          <span className="balance-loading">Loading...</span>
        ) : balance !== null ? (
          <span className="balance-value">{balance} SUI</span>
        ) : (
          <span className="balance-error">Error</span>
        )}
      </div>
    </div>
  );
};

export default WalletBalance;
