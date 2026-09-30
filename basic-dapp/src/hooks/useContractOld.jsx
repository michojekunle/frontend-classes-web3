import { useEffect, useCallback } from "react";
import { Contract, JsonRpcProvider } from "ethers";
import { useWalletConnection } from "./useWalletConnection";
import { CONTRACTS, rpc_url } from "../constants";

export const jsonRpcProvider = new JsonRpcProvider(rpc_url);

export const useContract = () => {
  const { signer, account, chainId, switchChain } = useWalletConnection();

  const getContractDetails = useCallback(async () => {
    console.log(signer);
    if (!signer) return;
    console.log(signer);

    const contract = new Contract(
      CONTRACTS.erc20.address,
      CONTRACTS.erc20.abi,
      signer
    );

    const name = await contract.name();
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();
    const totalSupply = await contract.totalSupply();

    if (account) {
      const usdtBalance = await contract.balanceOf(account);
      console.log("USDT Balance: ", usdtBalance);
    }

    const binanceHotWalletUsdtBal = await contract.balanceOf(
      "0xF977814e90dA44bFA03b6295A0616a897441aceC"
    );
    console.log("Binanceeeee USDT Balance: ", binanceHotWalletUsdtBal);

    console.log("Contract Name: ", name);
    console.log("Contract Symbol: ", symbol);
    console.log("Contract Decimals: ", decimals);
    console.log("Contract Total Supply: ", totalSupply);

    const approveTx = await contract.approve(
      "0x37cB04c15aA4800c86561884992A56889a897bF9",
      1
    );
    console.log("Approve Tx", approveTx);
  }, [account, signer]);

  useEffect(() => {
    getContractDetails();
  }, [account, signer]);

  return {};
};
