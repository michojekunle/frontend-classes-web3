import React, { useState } from "react";
import * as Tooltip from "@radix-ui/react-tooltip";
import {
  ClipboardCopyIcon,
  ExternalLinkIcon,
  InfoCircledIcon,
  ReloadIcon,
} from "@radix-ui/react-icons";
import { useWalletConnection } from "../hooks/useWalletConnection";
import { ethers } from "ethers";

export default function Eip1193WalletConnector() {
  const {
    accountAddress,
    chainId,
    balance,
    isLoading,
    connectWallet,
    disconnectWallet,
    getBalance,
  } = useWalletConnection();
  const [inputAddress, setInputAddress] = useState("");

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    getBalance(inputAddress);
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white shadow-lg rounded-lg overflow-hidden">
      <div className="p-8">
        <h1 className="text-3xl font-bold text-center text-gray-900 mb-2">
          EIP 1193 Wallet Connector
        </h1>
        <div className="flex items-center justify-center text-sm text-gray-600 mb-8">
          <Tooltip.Provider>
            <Tooltip.Root>
              <Tooltip.Trigger asChild>
                <button className="inline-flex items-center">
                  <InfoCircledIcon className="w-4 h-4 mr-1" />
                  <span>Securely connect and manage your Ethereum wallet</span>
                </button>
              </Tooltip.Trigger>
              <Tooltip.Portal>
                <Tooltip.Content
                  className="max-w-xs p-2 text-xs bg-gray-900 text-white rounded shadow-lg"
                  sideOffset={5}
                >
                  Note: this implementation uses the latest wallet that assigns
                  its provider details to the `window.ethereum` browser state.
                  <Tooltip.Arrow className="fill-gray-900" />
                </Tooltip.Content>
              </Tooltip.Portal>
            </Tooltip.Root>
          </Tooltip.Provider>
        </div>

        <div className="space-y-6">
          {accountAddress ? (
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Connected Account
              </h3>
              <div className="flex items-center justify-between">
                <code className="text-xs sm:text-sm break-all text-gray-800">
                  {accountAddress}
                </code>
                <button
                  onClick={() => copyToClipboard(accountAddress)}
                  className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <ClipboardCopyIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 bg-yellow-100 rounded-lg">
              <p className="text-yellow-800">
                No wallet connected. Please connect your wallet to use this
                feature.
              </p>
            </div>
          )}

          {chainId !== null && (
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Chain ID
              </h3>
              <div className="flex items-center justify-between">
                <span className="text-gray-800">{chainId.toString()}</span>
                <a
                  href={`https://chainlist.org/chain/${chainId.toString()}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  View Chain
                  <ExternalLinkIcon className="w-4 h-4 ml-1" />
                </a>
              </div>
            </div>
          )}

          <form onSubmit={handleAddressSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="address"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Enter Address to Check Balance
              </label>
              <div className="flex">
                <input
                  type="text"
                  id="address"
                  value={inputAddress}
                  onChange={(e) => setInputAddress(e.target.value)}
                  placeholder="0x..."
                  className="flex-grow px-3 py-2 border border-gray-300 rounded-l-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white font-medium rounded-r-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
                  disabled={!ethers.isAddress(inputAddress)}
                >
                  {isLoading ? (
                    <ReloadIcon className="w-5 h-5 animate-spin" />
                  ) : (
                    "Check Balance"
                  )}
                </button>
              </div>
            </div>
          </form>

          {balance !== null && (
            <div className="p-4 bg-gray-100 rounded-lg">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Balance
              </h3>
              <p className="text-lg font-medium text-gray-900">{balance} ETH</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-8 py-4 bg-gray-50 border-t border-gray-200">
        {accountAddress ? (
          <button
            onClick={() => disconnectWallet()}
            className="w-full px-4 py-2 bg-red-600 text-white font-medium rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
          >
            Disconnect Wallet
          </button>
        ) : (
          <button
            onClick={() => connectWallet()}
            className="w-full px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
          >
            Connect Wallet
          </button>
        )}
      </div>
    </div>
  );
}
