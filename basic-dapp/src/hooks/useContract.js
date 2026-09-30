import { useState, useEffect, useCallback, useMemo } from "react";
import { Contract, formatEther, JsonRpcProvider, Typed } from "ethers";
import { useWalletConnection } from "./useWalletConnection";
import { CONTRACTS, rpc_url } from "../constants";

export const jsonRpcProvider = new JsonRpcProvider(rpc_url);

export const useContract = () => {
  const { signer } = useWalletConnection();

  const getContract = useCallback(
    (withSigner = false) => {
      let contract;
      if (withSigner) {
        if (!signer) return;
        contract = new Contract(
          CONTRACTS.multicall2.address,
          CONTRACTS.multicall2.abi,
          signer
        );
      } else {
        contract = new Contract(
          CONTRACTS.multicall2.address,
          CONTRACTS.multicall2.abi,
          jsonRpcProvider
        );
      }

      return contract;
    },
    [signer]
  );

  return {
    getContract,
  };
};
