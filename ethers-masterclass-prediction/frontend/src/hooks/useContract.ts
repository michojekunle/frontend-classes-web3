import { useCallback } from "react";
import { Contract, InterfaceAbi } from "ethers";
import { useWalletConnection } from "./useWalletConnection";

export const useContract = () => {
  const { provider, signer } = useWalletConnection();

  const getContract = useCallback(
    (
      address: string,
      abi: InterfaceAbi,
      withSigner = false
    ): Contract | undefined => {
      if (!address || !abi) {
        console.error("Missing contract address or ABI");
        return undefined;
      }

      // Write contract — use the connected wallet signer
      if (withSigner) {
        if (!signer) {
          console.error("No signer available");
          return undefined;
        }

        return new Contract(address, abi, signer);
      }

      // Read contract — use the connected wallet provider
      if (!provider) {
        console.error("No provider available");
        return undefined;
      }

      return new Contract(address, abi, provider);
    },
    [provider, signer]
  );

  return {
    getContract,
  };
};