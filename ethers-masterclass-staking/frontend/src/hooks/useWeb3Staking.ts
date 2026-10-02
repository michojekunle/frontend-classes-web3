import { useEffect, useState, useMemo, useCallback } from "react";
import { CONTRACTS } from "../contracts/stakingConfig";
import { PoolData } from "../types/staking";
import { useContract } from "./useContract";
import { useWalletConnection } from "./useWalletConnection";
import {
  Contract,
  formatUnits,
  Interface,
  isAddress,
  ZeroAddress,
  parseEther,
  parseUnits,
} from "ethers";

export type TransactionStatus =
  | "idle"
  | "approving"
  | "confirming"
  | "success";

export const useStakingVault = (walletAddress: string | null) => {
  const {
    wallet: { address, chainId },
    validateChainId,
    isSupportedChain,
  } = useWalletConnection();
  const { getContract } = useContract();
  const { vault, mgo, stk, multicall2 } = CONTRACTS;
  const [pools, setPools] = useState<PoolData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] =
    useState<TransactionStatus>("idle");
  const [isVaultOwner, setIsVaultOwner] = useState(false);
  const [vaultOwner, setVaultOwner] = useState<string | null>(null);

  // TODO FOR CLASS:
  // 1. Instantiate read-only Contract or Signer-connected Contract
  const vaultContract = useMemo(
    () => getContract(vault.address, vault.abi, true),
    [getContract]
  );
  const mgoContract = useMemo(
    () => getContract(mgo.address, mgo.abi, true),
    [getContract]
  );
  const multicall2Contract = useMemo(
    () => getContract(multicall2.address, multicall2.abi, true),
    [getContract]
  );
  const stkContract = useMemo(
    () => getContract(stk.address, stk.abi, true),
    [getContract]
  );

  // define the interface
  const intfce = useMemo(() => new Interface(vault.abi), []);

  const validAddress = useMemo(
    () => (isAddress(walletAddress) ? walletAddress : ZeroAddress),
    [walletAddress]
  );

  useEffect(() => {
    let isActive = true;

    const checkVaultOwner = async () => {
      if (!vaultContract || !walletAddress) {
        setIsVaultOwner(false);
        setVaultOwner(null);
        return;
      }

      try {
        const owner = await vaultContract.owner();
        if (isActive) {
          setVaultOwner(owner);
          setIsVaultOwner(owner.toLowerCase() === walletAddress.toLowerCase());
        }
      } catch {
        if (isActive) {
          setIsVaultOwner(false);
          setVaultOwner(null);
        }
      }
    };

    checkVaultOwner();

    return () => {
      isActive = false;
    };
  }, [vaultContract, walletAddress]);

  // 2. Fetch pool count and iterate over poolInfo
  const getStakingPools = useCallback(
    async (
      contract: Contract,
      vaultContract: Contract,
      mgoContract: Contract,
      stkContract: Contract,
      vault: { address: string; abi: any }
    ) => {
      console.log("Helloooooooo");
      let pools: PoolData[] = [];

      // Get pool length
      const poolLength = await vaultContract.poolLength();
      // Fetch Token Symbols and Decimals
      const mgoTokenSymbol = await mgoContract.symbol();
      const mgoDecimals = await mgoContract.decimals();
      const stkTokenSymbol = await stkContract.symbol();
      const stkDecimals = await stkContract.decimals();

      //fetch token balance
      const userTokenBalance = await stkContract.balanceOf(validAddress);

      console.log("Pool Length: ", poolLength);

      if (!poolLength || poolLength == 0) {
        setPools([]);
        return [];
      }

      // define the calls
      const calls = Array.from({ length: Number(poolLength) }, (_, i) => i).map(
        (id: number) => ({
          target: vault.address,
          callData: intfce.encodeFunctionData("poolInfo", [id]),
        })
      );

      const userInfoCalls = Array.from(
        { length: Number(poolLength) },
        (_, i) => i
      ).map((id: number) => ({
        target: vault.address,
        callData: intfce.encodeFunctionData("userInfo", [id, validAddress]),
      }));

      const pendingRewardCalls = Array.from(
        { length: Number(poolLength) },
        (_, i) => i
      ).map((id: number) => ({
        target: vault.address,
        callData: intfce.encodeFunctionData("pendingReward", [
          id,
          validAddress,
        ]),
      }));

      //make the aggregate calls
      const [poolsResponse, userInfoResponse, pendingRewardResponse] =
        await Promise.all([
          contract.aggregate.staticCall(calls),
          contract.aggregate.staticCall(userInfoCalls),
          contract.aggregate.staticCall(pendingRewardCalls),
        ]);

      const [_, poolsResult] = poolsResponse;
      const [__, userInfoResult] = userInfoResponse;
      const [___, pendingRewardResult] = pendingRewardResponse;

      console.log("Undecoded Pool results:::::", poolsResult);
      console.log("Undecoded userInfo results:::::", userInfoResult);
      console.log("Undecoded pendingRewards results:::::", pendingRewardResult);

      // decode the results of the aggregate calls
      const decodedPools = poolsResult.map((result: string) =>
        intfce.decodeFunctionResult("poolInfo", result)
      );

      const decodedUserInfo = userInfoResult.map((result: string) =>
        intfce.decodeFunctionResult("userInfo", result)
      );

      const decodedPendingRewards = pendingRewardResult.map((result: string) =>
        intfce.decodeFunctionResult("pendingReward", result)
      );

      console.log("Decoded Pools", decodedPools);
      console.log("decodedUserInfo", decodedUserInfo);
      console.log("decodedPendindRewards", decodedPendingRewards);

      const fetchedPools = decodedPools.map((proxy: any, idx: number) => ({
        poolId: idx,
        stakingTokenAddress: String(proxy.stakingToken),
        rewardRatePerSecond: formatUnits(
          proxy.rewardRatePerSecond,
          mgoDecimals
        ),
        lastRewardTime: Number(proxy.lastRewardTime),
        accRewardPerShare: Number(proxy.accRewardPerShare),
        totalStaked: formatUnits(proxy.totalStaked, stkDecimals),
        isEthPool: proxy.isEthPool,
        tokenSymbol: proxy.isEthPool ? "ETH" : stkTokenSymbol,
        tokenDecimals: Number(mgoDecimals),
        userStakedAmount: formatUnits(decodedUserInfo[idx].amount, stkDecimals),
        userPendingReward: formatUnits(
          decodedPendingRewards[idx][0],
          mgoDecimals
        ),
        userTokenBalance: formatUnits(userTokenBalance, stkDecimals),
      }));

      setPools(fetchedPools);
    },
    [intfce, validAddress]
  );

  useEffect(() => {
    console.log("POOL EFFECT:", {
      vaultContract,
      multicall2Contract,
      mgoContract,
      stkContract,
      vault,
      chainId,
      walletAddress,
      isSupported: isSupportedChain,
    });

    console.log("CHECKS:", {
      vaultContract: !!vaultContract,
      multicall2Contract: !!multicall2Contract,
      mgoContract: !!mgoContract,
      stkContract: !!stkContract,
      isSupportedChain,
    });

    if (!vaultContract) {
      console.log("❌ vaultContract is missing");
      return;
    }

    if (!multicall2Contract) {
      console.log("❌ multicall2Contract is missing");
      return;
    }

    if (!mgoContract) {
      console.log("❌ mgoContract is missing");
      return;
    }

    if (!stkContract) {
      console.log("❌ stkContract is missing");
      return;
    }

    if (!isSupportedChain) {
      console.log("❌ Chain is not supported");
      return;
    }

    const run = async () => {
      console.log("Fetching poolssssssss!");

      try {
        setIsLoading(true);
        await getStakingPools(
          multicall2Contract,
          vaultContract,
          mgoContract,
          stkContract,
          vault
        );
      } catch (error: any) {
        setError(
          error && error.message
            ? error.message
            : "Failed to fetch staking pools; an unexpected error occured while fetching staking pools."
        );
      } finally {
        setIsLoading(false);
      }

      console.log("Doneee Fetching poolssssssss!");
    };

    run();
  }, [
    vaultContract,
    multicall2Contract,
    mgoContract,
    stkContract,
    isSupportedChain,
    vault,
    getStakingPools,
  ]);

  // 3. Fetch token symbol and decimals using ERC20 contract instance
  // 4. Perform Multicall/Promise.all for pendingReward and userInfo
  
  // 5. Setup Ethers event listeners (vaultContract.on('Staked', ...)) for live UI updates
  // 6. Handle errors (user rejection, insufficient allowance, execution revert)

  const refreshPools = async () => {
    if (!multicall2Contract || !vaultContract || !mgoContract || !stkContract) {
      throw new Error("Connect a wallet before using the staking actions.");
    }

    await getStakingPools(
      multicall2Contract,
      vaultContract,
      mgoContract,
      stkContract,
      vault
    );
  };

  const stakeTokens = async (
    poolId: number,
    amount: string,
    isEth: boolean
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      setTransactionStatus("confirming");

      if (!vaultContract) {
        throw new Error("The vault contract is not connected.");
      }

      if (isEth) {
        const tx = await vaultContract.stake(poolId, 0, {
          value: parseEther(amount),
        });
        await tx.wait();
      } else {
        if (!stkContract || !walletAddress) {
          throw new Error("Connect a wallet before staking STK.");
        }

        const decimals = await stkContract.decimals();
        const parsedAmount = parseUnits(amount, decimals);
        const currentAllowance = await stkContract.allowance(
          walletAddress,
          vault.address
        );

        if (currentAllowance < parsedAmount) {
          setTransactionStatus("approving");
          const approveTx = await stkContract.approve(
            vault.address,
            parsedAmount
          );
          await approveTx.wait();
          setTransactionStatus("confirming");
        }

        const tx = await vaultContract.stake(poolId, parsedAmount);
        await tx.wait();
      }

      await refreshPools();
      setTransactionStatus("success");
    } catch (err: any) {
      console.error("Stake failed:", err);
      setTransactionStatus("idle");
      setError(
        err?.reason || err?.shortMessage || err?.message || "Stake transaction failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const withdrawTokens = async (poolId: number, amount: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setTransactionStatus("confirming");

      if (!vaultContract) {
        throw new Error("The vault contract is not connected.");
      }

      const pool = pools.find((item) => item.poolId === poolId);
      if (!pool) {
        throw new Error("Staking pool not found.");
      }

      const decimals = pool.isEthPool ? 18 : await stkContract?.decimals();
      if (decimals === undefined) {
        throw new Error("The staking token is not connected.");
      }

      const tx = await vaultContract.withdraw(
        poolId,
        parseUnits(amount, decimals)
      );
      await tx.wait();

      await refreshPools();
      setTransactionStatus("success");
    } catch (err: any) {
      console.error("Withdraw failed:", err);
      setTransactionStatus("idle");
      setError(
        err?.reason || err?.shortMessage || err?.message || "Withdraw transaction failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const claimRewards = async (poolId: number) => {
    try {
      setIsLoading(true);
      setError(null);
      setTransactionStatus("confirming");

      if (!vaultContract) {
        throw new Error("The vault contract is not connected.");
      }

      const tx = await vaultContract.claimReward(poolId);
      await tx.wait();
      await refreshPools();
      setTransactionStatus("success");
    } catch (err: any) {
      console.error("Claim failed:", err);
      setTransactionStatus("idle");
      setError(
        err?.reason || err?.shortMessage || err?.message || "Claim transaction failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const mintTestTokens = async () => {
    try {
      setIsLoading(true);
      setError(null);
      setTransactionStatus("confirming");

      if (!stkContract) {
        throw new Error("The staking token contract is not connected.");
      }

      const decimals = await stkContract.decimals();
      const tx = await stkContract.faucet(parseUnits("100", decimals));
      await tx.wait();
      await refreshPools();
      setTransactionStatus("success");
    } catch (err: any) {
      console.error("Faucet failed:", err);
      setTransactionStatus("idle");
      setError(
        err?.reason || err?.shortMessage || err?.message || "Faucet transaction failed"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const createPool = async (isEthPool: boolean, rewardRate: string) => {
    try {
      setIsLoading(true);
      setError(null);
      setTransactionStatus("confirming");

      if (!vaultContract) {
        throw new Error("The vault contract is not connected.");
      }

      if (!isVaultOwner) {
        throw new Error("Only the vault owner can create a pool.");
      }

      const stakingTokenAddress = isEthPool ? ZeroAddress : stk.address;
      const tx = await vaultContract.addPool(
        stakingTokenAddress,
        parseEther(rewardRate),
        isEthPool
      );
      await tx.wait();
      await refreshPools();
      setTransactionStatus("success");
    } catch (err: any) {
      console.error("Create pool failed:", err);
      setTransactionStatus("idle");
      setError(
        err?.reason ||
          err?.shortMessage ||
          err?.message ||
          "Only the vault owner can create a pool."
      );
    } finally {
      setIsLoading(false);
    }
  };
  return {
    pools,
    isLoading,
    error,
    isVaultOwner,
    vaultOwner,
    transactionStatus,
    stakeTokens,
    withdrawTokens,
    claimRewards,
    mintTestTokens,
    createPool,
  };
};
