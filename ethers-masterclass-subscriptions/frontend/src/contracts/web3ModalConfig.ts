import { createWeb3Modal } from "@web3modal/wagmi/react";
import { defaultWagmiConfig } from "@web3modal/wagmi/react/config";
import { sepolia, mainnet } from "wagmi/chains";

// =========================================================================
// 🎯 STUDENT TODO #4: Configure Reown AppKit & Wagmi Modal
// =========================================================================
// Instructions:
// 1. Obtain a free Project ID from https://cloud.reown.com.
// 2. Replace 'YOUR_APPKIT_PROJECT_ID' below with your actual Project ID.
// =========================================================================
export const projectId = import.meta.env.VITE_APPKIT_PROJECT_ID;

// Define metadata for AppKit Modal
const metadata = {
  name: "StreamPay Vault",
  description: "Automated Web3 Recurrent SaaS Payments & Payroll Vault",
  url: "https://web3-subscriptions.com",
  icons: ["https://avatars.githubusercontent.com/u/37784886"],
};

// Configure Wagmi Chains
const chains = [sepolia, mainnet] as const;
export const wagmiConfig = defaultWagmiConfig({
  chains,
  projectId,
  metadata,
});

// Initialize AppKit Modal with Dark Orange Paper theme
createWeb3Modal({
  wagmiConfig,
  projectId,
  themeMode: "dark",
  themeVariables: {
    "--w3m-accent": "#F97316",
    "--w3m-border-radius-master": "14px",
  },
});
