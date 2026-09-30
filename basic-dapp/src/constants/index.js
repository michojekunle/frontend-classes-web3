import erc20abi from "../abi/ecr20.json";
import multicallabi from "../abi/multicall2.json";

export const EIP6963AnnounceProvider = "eip6963:announceProvider";
export const EIP6963RequestProvider = "eip6963:requestProvider";
export const rpc_url =
  "https://mainnet.chainnodes.org/c3d58010-4e71-4f8a-9370-11974afdd3a7";

export const CONTRACTS = {
  erc20: {
    address: "0xdAC17F958D2ee523a2206206994597C13D831ec7",
    abi: erc20abi,
  },
  multicall2: {
    address: "0x5ba1e12693dc8f9c48aad8770482f4739beed696",
    abi: multicallabi,
  },
};

export const SUPPORTED_CHAINS = {
  1: {
    id: 1,
    name: "Ethereum",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrl: "https://ethereum-rpc.publicnode.com",
    blockExplorer: "https://etherscan.io",
  },

  11155111: {
    id: 11155111,
    name: "Sepolia",
    nativeCurrency: {
      name: "Sepolia Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrl: "https://ethereum-sepolia-rpc.publicnode.com",
    blockExplorer: "https://sepolia.etherscan.io",
  },

  8453: {
    id: 8453,
    name: "Base",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrl: "https://mainnet.base.org",
    blockExplorer: "https://basescan.org",
  },

  84532: {
    id: 84532,
    name: "Base Sepolia",
    nativeCurrency: {
      name: "Ether",
      symbol: "ETH",
      decimals: 18,
    },
    rpcUrl: "https://sepolia.base.org",
    blockExplorer: "https://sepolia-sepolia.blockscout.com",
  },
};
