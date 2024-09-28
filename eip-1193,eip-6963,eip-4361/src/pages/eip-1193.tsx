import React, { useState, useEffect } from "react";
import { BrowserProvider, Signer } from "ethers"; // ethers v6
import { Box } from "@radix-ui/themes";

const Eip1193WalletConnector: React.FC = () => {
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);
  const [_, setProvider] = useState<BrowserProvider | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  // Function to connect to the wallet
  const connectWallet = async () => {
    if ((window as any).ethereum) {
      try {
        const provider = new BrowserProvider((window as any).ethereum); // ethers v6 - BrowserProvider
        await provider.send("eth_requestAccounts", []); // Request wallet connection

        const signer: Signer = await provider.getSigner(); // ethers v6 - get signer
        const account = await signer.getAddress(); // ethers v6 - get account address
        setProvider(provider);
        setAccount(account);
        setIsConnected(true);

        const network = await provider.getNetwork(); // ethers v6 - get network info
        setChainId(Number(network.chainId));

        // Persist data to localStorage
        localStorage.setItem("account", account);
        localStorage.setItem("chainId", network.chainId.toString());
        localStorage.setItem("isConnected", "true");

        console.log("Connected to account:", account);
      } catch (error) {
        console.error("Failed to connect:", error);
      }
    } else {
      alert("MetaMask not detected. Please install MetaMask!");
    }
  };

  // Function to disconnect wallet (simulated by clearing state)
  const disconnectWallet = () => {
    setAccount(null);
    setChainId(null);
    setIsConnected(false);
    setProvider(null);
    localStorage.removeItem("account");
    localStorage.removeItem("chainId");
    localStorage.removeItem("isConnected");

    console.log(
      "Disconnected from wallet. Please manually disconnect from MetaMask if necessary."
    );
    console.log("Disconnected from wallet");
  };

  // Listen for account changes
  const handleAccountsChanged = (accounts: string[]) => {
    if (accounts.length === 0) {
      disconnectWallet();
    } else {
      setAccount(accounts[0]);
      localStorage.setItem("account", accounts[0]);
      console.log("Account changed:", accounts[0]);
    }
  };

  // Listen for chain changes
  const handleChainChanged = (chainId: string) => {
    const numericChainId = parseInt(chainId, 16); // Convert chainId to a number
    setChainId(numericChainId);
    localStorage.setItem("chainId", numericChainId.toString());
    console.log("Chain changed to:", numericChainId);
  };

  // Listen for disconnection
  const handleDisconnect = () => {
    disconnectWallet();
    console.log("Wallet disconnected");
  };

  useEffect(() => {
    const { ethereum } = window as any;
    if (ethereum) {
      ethereum.on("accountsChanged", handleAccountsChanged);
      ethereum.on("chainChanged", handleChainChanged);
      ethereum.on("disconnect", handleDisconnect);

      if (localStorage.getItem("isConnected") === "true") {
        connectWallet(); // Automatically reconnect if already connected
      }

      return () => {
        ethereum.removeListener("accountsChanged", handleAccountsChanged);
        ethereum.removeListener("chainChanged", handleChainChanged);
        ethereum.removeListener("disconnect", handleDisconnect);
      };
    }
  }, []);

  return (
    <div className="flex space-y-8 flex-col min-h-screen bg-white items-center justify-center text-center">
      <h1 className="text-5xl">EIP 1193 Wallet Connector</h1>
      <p className="italic max-w-md">
        Note: this implementation is buggy in that it uses the latest wallet
        that assigns its provider details to the{" "}
        <strong>`window.ethereum`</strong> browser state and in my case it uses
        phantom wallet cuase it's the last injected wallet
      </p>

      {isConnected ? (
        <Box about="clean state" title="Connection Details">
          <p className="text-2xl mb-4">
            Connected Account:<span></span> <span>{account}</span>
          </p>
          <p className="text-xl mb-3">
            Chain ID: <span>{chainId}</span>
          </p>
          <button
            onClick={disconnectWallet}
            className="bg-red-500 py-2 px-5 rounded-md text-white font-bold"
          >
            Disconnect Wallet
          </button>
        </Box>
      ) : (
        <button
          onClick={connectWallet}
          className="bg-green-500 py-2 px-5 rounded-md text-white font-bold"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
};

export default Eip1193WalletConnector;
