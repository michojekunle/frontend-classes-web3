import { WalletState } from '../types/staking';

export const useWeb3Wallet = () => {
  // TODO FOR CLASS:
  // 1. Check if window.ethereum exists (EIP-1193 provider)
  // 2. Instantiate BrowserProvider from ethers.v6: const provider = new ethers.BrowserProvider(window.ethereum)
  // 3. Listen to 'accountsChanged' and 'chainChanged' events
  // 4. Handle wallet connection, chain switching (e.g. Sepolia / Localhost 31337)
  
  const wallet: WalletState = {
    address: null,
    chainId: null,
    balance: '0.00',
    isConnected: false,
    isConnecting: false,
    error: null,
  };

  const connectWallet = async () => {
    console.log('Class TODO: Implement connectWallet using ethers BrowserProvider');
  };

  const switchNetwork = async (targetChainId: number) => {
    console.log('Class TODO: Implement switchNetwork via wallet_switchEthereumChain');
  };

  return { wallet, connectWallet, switchNetwork };
};

export const useStakingVault = (walletAddress: string | null) => {
  // TODO FOR CLASS:
  // 1. Instantiate read-only Contract or Signer-connected Contract
  // 2. Fetch pool count and iterate over poolInfo
  // 3. Fetch token symbol and decimals using ERC20 contract instance
  // 4. Perform Multicall/Promise.all for pendingReward and userInfo
  // 5. Setup Ethers event listeners (vaultContract.on('Staked', ...)) for live UI updates
  // 6. Handle errors (user rejection, insufficient allowance, execution revert)

  const pools = [];
  const isLoading = false;
  const error = null;

  const stakeTokens = async (poolId: number, amount: string, isEth: boolean) => {
    console.log('Class TODO: Handle ERC20 approval if needed, then call vault.stake()');
  };

  const withdrawTokens = async (poolId: number, amount: string) => {
    console.log('Class TODO: Call vault.withdraw() with ethers.parseUnits()');
  };

  const claimRewards = async (poolId: number) => {
    console.log('Class TODO: Call vault.claimReward() and handle tx response');
  };

  const mintTestTokens = async () => {
    console.log('Class TODO: Call ERC20 faucet() for instant testing tokens');
  };

  return { pools, isLoading, error, stakeTokens, withdrawTokens, claimRewards, mintTestTokens };
};
