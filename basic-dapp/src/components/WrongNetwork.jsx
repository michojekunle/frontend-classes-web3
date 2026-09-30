import { useState } from "react";

const WrongNetwork = ({ currentChainId, supportedChains, switchChain }) => {
  const [isSwitching, setIsSwitching] = useState(false);

  const [error, setError] = useState(null);

  const handleSwitch = async (chainId) => {
    try {
      setError(null);
      setIsSwitching(true);

      await switchChain(chainId);
    } catch (error) {
      console.error("Failed to switch network:", error);

      if (error.code === 4001) {
        setError("Network switch was rejected in your wallet.");
      } else {
        setError("Failed to switch network. Please try again.");
      }
    } finally {
      setIsSwitching(false);
    }
  };

  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-red-900">Wrong Network</h2>

        <p className="mt-1 text-sm text-red-700">
          This application does not support the network you're currently
          connected to.
        </p>

        <p className="mt-2 text-xs text-red-600">
          Current chain ID: {currentChainId}
        </p>
      </div>

      <div>
        <p className="mb-2 text-sm font-medium text-red-900">
          Switch to a supported network:
        </p>

        <div className="flex flex-wrap gap-2">
          {Object.values(supportedChains).map((chain) => (
            <button
              key={chain.id}
              onClick={() => handleSwitch(chain.id)}
              disabled={isSwitching}
              className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-gray-900 shadow-sm ring-1 ring-gray-200 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isSwitching ? "Switching..." : chain.name}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
    </div>
  );
};

export default WrongNetwork;
