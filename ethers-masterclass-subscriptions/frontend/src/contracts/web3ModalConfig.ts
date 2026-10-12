import { createWeb3Modal } from '@web3modal/wagmi/react';
import { defaultWagmiConfig } from '@web3modal/wagmi/react/config';
import { mainnet, sepolia } from 'viem/chains';

export const projectId = 'd0421cd0fd8baf18bcb5614e217930a4';

const metadata = {
  name: 'StreamPay Vault',
  description: 'Automated Web3 Recurrent SaaS Payments & Payroll Vault',
  url: 'https://web3-subscriptions.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

const chains = [mainnet, sepolia] as const;

export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

createWeb3Modal({
  wagmiConfig,
  projectId,
  themeMode: 'dark',
  themeVariables: {
    '--w3m-accent': '#F97316',
    '--w3m-border-radius-master': '14px',
  },
});
