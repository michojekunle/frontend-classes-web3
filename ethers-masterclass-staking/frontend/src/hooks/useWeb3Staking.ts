import { useEffect, useState, useMemo, useCallback } from "react";
import { CONTRACTS } from "../contracts/stakingConfig";
import { PoolData, StakingEventLog } from "../types/staking";
import { useContract } from "./useContract";
import { useWalletConnection } from "./useWalletConnection";
import {
  Contract,
  formatUnits,
  parseUnits,
  parseEther,
  Interface,
  isAddress,
  ZeroAddress,
} from "ethers";

export const useStakingVault = (walletAddress: string | null) => {
  const {
    wallet: { address, chainId },
    isSupportedChain,
    getBalance: refreshEthBalance,
  } = useWalletConnection();
  const { getContract } = useContract();
  const { vault, mgo, stk, multicall2 } = CONTRACTS;

  const [pools, setPools] = useState<PoolData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<StakingEventLog[]>([]);

  // Contracts instantiated with signer when connected for writing/reading
  const vaultContract = useMemo(
    () => getContract(vault.address, vault.abi, true),
    [getContract, vault.address, vault.abi]
  );
  const mgoContract = useMemo(
    () => getContract(mgo.address, mgo.abi, true),
    [getContract, mgo.address, mgo.abi]
  );
  const multicall2Contract = useMemo(
    () => getContract(multicall2.address, multicall2.abi, true),
    [getContract, multicall2.address, multicall2.abi]
  );
  const stkContract = useMemo(
    () => getContract(stk.address, stk.abi, true),
    [getContract, stk.address, stk.abi]
  );

  // Read-only vault contract for global pool queries and event listeners
  const readOnlyVaultContract = useMemo(
    () => getContract(vault.address, vault.abi, false),
    [getContract, vault.address, vault.abi]
  );

  const intfce = useMemo(() => new Interface(vault.abi), [vault.abi]);

  const validAddress = useMemo(
    () =>
      walletAddress && isAddress(walletAddress) ? walletAddress : ZeroAddress,
    [walletAddress]
  );

  // Fetch pools using Multicall aggregate calls
  const getStakingPools = useCallback(
    async (
      contract: Contract,
      vaultContractInstance: Contract,
      mgoContractInstance: Contract,
      stkContractInstance: Contract,
      vaultConfig: { address: string; abi: any }
    ) => {
      const poolLength = await vaultContractInstance.poolLength();
      if (!poolLength || Number(poolLength) === 0) {
        setPools([]);
        return;
      }

      const mgoTokenSymbol = await mgoContractInstance.symbol();
      const mgoDecimals = await mgoContractInstance.decimals();
      const stkTokenSymbol = await stkContractInstance.symbol();
      const stkDecimals = await stkContractInstance.decimals();

      const userTokenBalance =
        validAddress !== ZeroAddress
          ? await stkContractInstance.balanceOf(validAddress)
          : 0n;

      const userAllowance =
        validAddress !== ZeroAddress
          ? await stkContractInstance.allowance(
              validAddress,
              vaultConfig.address
            )
          : 0n;

      const calls = Array.from({ length: Number(poolLength) }, (_, i) => i).map(
        (id: number) => ({
          target: vaultConfig.address,
          callData: intfce.encodeFunctionData("poolInfo", [id]),
        })
      );

      const userInfoCalls = Array.from(
        { length: Number(poolLength) },
        (_, i) => i
      ).map((id: number) => ({
        target: vaultConfig.address,
        callData: intfce.encodeFunctionData("userInfo", [id, validAddress]),
      }));

      const pendingRewardCalls = Array.from(
        { length: Number(poolLength) },
        (_, i) => i
      ).map((id: number) => ({
        target: vaultConfig.address,
        callData: intfce.encodeFunctionData("pendingReward", [
          id,
          validAddress,
        ]),
      }));

      const [poolsResponse, userInfoResponse, pendingRewardResponse] =
        await Promise.all([
          contract.aggregate.staticCall(calls),
          contract.aggregate.staticCall(userInfoCalls),
          contract.aggregate.staticCall(pendingRewardCalls),
        ]);

      const [_, poolsResult] = poolsResponse;
      const [__, userInfoResult] = userInfoResponse;
      const [___, pendingRewardResult] = pendingRewardResponse;

      const decodedPools = poolsResult.map((result: string) =>
        intfce.decodeFunctionResult("poolInfo", result)
      );
      const decodedUserInfo = userInfoResult.map((result: string) =>
        intfce.decodeFunctionResult("userInfo", result)
      );
      const decodedPendingRewards = pendingRewardResult.map((result: string) =>
        intfce.decodeFunctionResult("pendingReward", result)
      );

      const fetchedPools = decodedPools.map((proxy: any, idx: number) => ({
        poolId: idx,
        stakingTokenAddress: String(proxy.stakingToken),
        rewardRatePerSecond: formatUnits(
          proxy.rewardRatePerSecond,
          mgoDecimals
        ),
        lastRewardTime: Number(proxy.lastRewardTime),
        accRewardPerShare: String(proxy.accRewardPerShare),
        totalStaked: formatUnits(
          proxy.totalStaked,
          proxy.isEthPool ? 18 : stkDecimals
        ),
        isEthPool: proxy.isEthPool,
        tokenSymbol: proxy.isEthPool ? "ETH" : stkTokenSymbol,
        tokenDecimals: proxy.isEthPool ? 18 : Number(stkDecimals),
        userStakedAmount: formatUnits(
          decodedUserInfo[idx].amount,
          proxy.isEthPool ? 18 : stkDecimals
        ),
        userPendingReward: formatUnits(
          decodedPendingRewards[idx][0],
          mgoDecimals
        ),
        userAllowance: formatUnits(userAllowance, stkDecimals),
        userTokenBalance: proxy.isEthPool
          ? "0"
          : formatUnits(userTokenBalance, stkDecimals),
      }));

      setPools(fetchedPools);
    },
    [intfce, validAddress]
  );

  const fetchPoolsData = useCallback(async () => {
    if (
      !vaultContract ||
      !multicall2Contract ||
      !mgoContract ||
      !stkContract ||
      !isSupportedChain
    ) {
      return;
    }
    try {
      setIsLoading(true);
      setError(null);
      await getStakingPools(
        multicall2Contract,
        vaultContract,
        mgoContract,
        stkContract,
        vault
      );
    } catch (err: any) {
      console.error("Failed to fetch staking pools:", err);
      setError(err?.reason || err?.message || "Failed to fetch staking pools");
    } finally {
      setIsLoading(false);
    }
  }, [
    vaultContract,
    multicall2Contract,
    mgoContract,
    stkContract,
    isSupportedChain,
    getStakingPools,
    vault,
  ]);

  useEffect(() => {
    fetchPoolsData();
  }, [fetchPoolsData]);

  // OPTIMISTIC UPDATES: Directly update targeted pool state instead of expensive refetching
  const optimisticallyUpdatePoolOnStake = useCallback(
    (targetPoolId: number, stakedAmountFormatted: string, isUserEvent: boolean) => {
      setPools((prevPools) =>
        prevPools.map((pool) => {
          if (pool.poolId !== targetPoolId) return pool;

          const numStaked = parseFloat(stakedAmountFormatted) || 0;
          const currentTotalStaked = parseFloat(pool.totalStaked) || 0;
          const currentUserStaked = parseFloat(pool.userStakedAmount) || 0;
          const currentTokenBalance = parseFloat(pool.userTokenBalance) || 0;

          return {
            ...pool,
            totalStaked: (currentTotalStaked + numStaked).toFixed(4),
            userStakedAmount: isUserEvent
              ? (currentUserStaked + numStaked).toFixed(4)
              : pool.userStakedAmount,
            userTokenBalance: isUserEvent && !pool.isEthPool
              ? Math.max(0, currentTokenBalance - numStaked).toFixed(4)
              : pool.userTokenBalance,
          };
        })
      );
    },
    []
  );

  const optimisticallyUpdatePoolOnWithdraw = useCallback(
    (targetPoolId: number, withdrawnAmountFormatted: string, isUserEvent: boolean) => {
      setPools((prevPools) =>
        prevPools.map((pool) => {
          if (pool.poolId !== targetPoolId) return pool;

          const numWithdrawn = parseFloat(withdrawnAmountFormatted) || 0;
          const currentTotalStaked = parseFloat(pool.totalStaked) || 0;
          const currentUserStaked = parseFloat(pool.userStakedAmount) || 0;
          const currentTokenBalance = parseFloat(pool.userTokenBalance) || 0;

          return {
            ...pool,
            totalStaked: Math.max(0, currentTotalStaked - numWithdrawn).toFixed(4),
            userStakedAmount: isUserEvent
              ? Math.max(0, currentUserStaked - numWithdrawn).toFixed(4)
              : pool.userStakedAmount,
            userTokenBalance: isUserEvent && !pool.isEthPool
              ? (currentTokenBalance + numWithdrawn).toFixed(4)
              : pool.userTokenBalance,
          };
        })
      );
    },
    []
  );

  const optimisticallyUpdatePoolOnRewardClaim = useCallback(
    (targetPoolId: number, isUserEvent: boolean) => {
      if (!isUserEvent) return;
      setPools((prevPools) =>
        prevPools.map((pool) => {
          if (pool.poolId !== targetPoolId) return pool;
          return {
            ...pool,
            userPendingReward: "0.00",
          };
        })
      );
    },
    []
  );

  // Event Listeners for Live Updates with OPTIMISTIC updates (No expensive full refetch!)
  useEffect(() => {
    const activeContract = vaultContract || readOnlyVaultContract;
    if (!activeContract) return;

    const handleStaked = (
      user: string,
      poolId: bigint,
      amount: bigint,
      event: any
    ) => {
      console.log("Event [Staked]:", user, poolId, amount);
      const targetPoolId = Number(poolId);
      const formattedAmount = formatUnits(amount, 18);
      const isUserEvent = user.toLowerCase() === (walletAddress || "").toLowerCase();

      const logId = `${event.log.transactionHash}-${event.log.index}`;
      const newLog: StakingEventLog = {
        id: logId,
        type: "Staked",
        user,
        poolId: targetPoolId,
        amount: formattedAmount,
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash,
        timestamp: new Date().toLocaleTimeString(),
      };

      setEvents((prev) => {
        if (prev.some((e) => e.id === logId)) return prev;
        return [newLog, ...prev.slice(0, 19)];
      });

      // OPTIMISTIC UPDATE ONLY - No expensive RPC multicall refetch!
      optimisticallyUpdatePoolOnStake(targetPoolId, formattedAmount, isUserEvent);
      if (isUserEvent) refreshEthBalance();
    };

    const handleWithdrawn = (
      user: string,
      poolId: bigint,
      amount: bigint,
      event: any
    ) => {
      console.log("Event [Withdrawn]:", user, poolId, amount);
      const targetPoolId = Number(poolId);
      const formattedAmount = formatUnits(amount, 18);
      const isUserEvent = user.toLowerCase() === (walletAddress || "").toLowerCase();

      const logId = `${event.log.transactionHash}-${event.log.index}`;
      const newLog: StakingEventLog = {
        id: logId,
        type: "Withdrawn",
        user,
        poolId: targetPoolId,
        amount: formattedAmount,
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash,
        timestamp: new Date().toLocaleTimeString(),
      };

      setEvents((prev) => {
        if (prev.some((e) => e.id === logId)) return prev;
        return [newLog, ...prev.slice(0, 19)];
      });

      // OPTIMISTIC UPDATE ONLY - No expensive RPC multicall refetch!
      optimisticallyUpdatePoolOnWithdraw(targetPoolId, formattedAmount, isUserEvent);
      if (isUserEvent) refreshEthBalance();
    };

    const handleRewardClaimed = (
      user: string,
      poolId: bigint,
      amount: bigint,
      event: any
    ) => {
      console.log("Event [RewardClaimed]:", user, poolId, amount);
      const targetPoolId = Number(poolId);
      const formattedAmount = formatUnits(amount, 18);
      const isUserEvent = user.toLowerCase() === (walletAddress || "").toLowerCase();

      const logId = `${event.log.transactionHash}-${event.log.index}`;
      const newLog: StakingEventLog = {
        id: logId,
        type: "RewardClaimed",
        user,
        poolId: targetPoolId,
        amount: formattedAmount,
        blockNumber: event.log.blockNumber,
        transactionHash: event.log.transactionHash,
        timestamp: new Date().toLocaleTimeString(),
      };

      setEvents((prev) => {
        if (prev.some((e) => e.id === logId)) return prev;
        return [newLog, ...prev.slice(0, 19)];
      });

      // OPTIMISTIC UPDATE ONLY - Zero out user's pending reward instantly!
      optimisticallyUpdatePoolOnRewardClaim(targetPoolId, isUserEvent);
      if (isUserEvent) refreshEthBalance();
    };

    activeContract.on("Staked", handleStaked);
    activeContract.on("Withdrawn", handleWithdrawn);
    activeContract.on("RewardClaimed", handleRewardClaimed);

    return () => {
      activeContract.off("Staked", handleStaked);
      activeContract.off("Withdrawn", handleWithdrawn);
      activeContract.off("RewardClaimed", handleRewardClaimed);
    };
  }, [
    vaultContract,
    readOnlyVaultContract,
    walletAddress,
    refreshEthBalance,
    optimisticallyUpdatePoolOnStake,
    optimisticallyUpdatePoolOnWithdraw,
    optimisticallyUpdatePoolOnRewardClaim,
  ]);

  // STAKE FUNCTION (ERC20 approval check + vault.stake call)
  const stakeTokens = async (
    poolId: number,
    amount: string,
    isEth: boolean
  ) => {
    if (!vaultContract) {
      throw new Error("Please connect your wallet first");
    }
    setError(null);
    try {
      const pool = pools.find((p) => p.poolId === poolId);
      const decimals = pool ? pool.tokenDecimals : 18;
      const parsedAmount = parseUnits(amount, decimals);

      if (isEth) {
        const tx = await vaultContract.stake(poolId, 0, {
          value: parsedAmount,
        });
        await tx.wait();
      } else {
        if (!stkContract)
          throw new Error("Staking token contract not initialized");

        const allowance: bigint = await stkContract.allowance(
          walletAddress,
          vault.address
        );
        if (allowance < parsedAmount) {
          console.log("Approving ERC20 token transfer...");
          const approveTx = await stkContract.approve(
            vault.address,
            parsedAmount
          );
          await approveTx.wait();
          console.log("Approval confirmed!");
        }

        const tx = await vaultContract.stake(poolId, parsedAmount);
        await tx.wait();
      }
    } catch (err: any) {
      console.error("Stake Error:", err);
      const errMsg =
        err?.reason ||
        err?.shortMessage ||
        err?.message ||
        "Transaction failed";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  // WITHDRAW FUNCTION (vault.withdraw call)
  const withdrawTokens = async (poolId: number, amount: string) => {
    if (!vaultContract) {
      throw new Error("Please connect your wallet first");
    }
    setError(null);
    try {
      const pool = pools.find((p) => p.poolId === poolId);
      const decimals = pool ? pool.tokenDecimals : 18;
      const parsedAmount = parseUnits(amount, decimals);

      const tx = await vaultContract.withdraw(poolId, parsedAmount);
      await tx.wait();
    } catch (err: any) {
      console.error("Withdraw Error:", err);
      const errMsg =
        err?.reason || err?.shortMessage || err?.message || "Withdrawal failed";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  // CLAIM REWARDS FUNCTION (vault.claimReward call)
  const claimRewards = async (poolId: number) => {
    if (!vaultContract) {
      throw new Error("Please connect your wallet first");
    }
    setError(null);
    try {
      const tx = await vaultContract.claimReward(poolId);
      await tx.wait();
    } catch (err: any) {
      console.error("Claim Error:", err);
      const errMsg =
        err?.reason ||
        err?.shortMessage ||
        err?.message ||
        "Claiming rewards failed";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  // MINT TEST TOKENS FUNCTION (ERC20 faucet call)
  const mintTestTokens = async () => {
    if (!stkContract) {
      throw new Error(
        "Staking token contract not initialized or wallet not connected"
      );
    }
    setError(null);
    try {
      const mintAmount = parseEther("100");
      const tx = await stkContract.faucet(mintAmount);
      await tx.wait();

      // Optimistically update STK balance for user
      setPools((prevPools) =>
        prevPools.map((pool) => {
          if (pool.isEthPool) return pool;
          const currentBal = parseFloat(pool.userTokenBalance) || 0;
          return {
            ...pool,
            userTokenBalance: (currentBal + 100).toFixed(4),
          };
        })
      );
    } catch (err: any) {
      console.error("Faucet Error:", err);
      const errMsg =
        err?.reason ||
        err?.shortMessage ||
        err?.message ||
        "Faucet mint failed";
      setError(errMsg);
      throw new Error(errMsg);
    }
  };

  return {
    pools,
    events,
    isLoading,
    error,
    stakeTokens,
    withdrawTokens,
    claimRewards,
    mintTestTokens,
    refetchPools: fetchPoolsData,
  };
};
