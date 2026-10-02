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

export const useStakingVault = (walletAddress: string | null) => {
  const {
    wallet: { chainId },
    isSupportedChain,
  } = useWalletConnection();

  const { getContract } = useContract();

  const { vault, mgo, stk, multicall2 } = CONTRACTS;

  const [pools, setPools] = useState<PoolData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /*
   * Contract instances
   *
   * We use signer-connected contracts because the assignment
   * includes both reads and write transactions.
   */
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

  /*
   * Interface is used to encode/decode Multicall data.
   */
  const intfce = useMemo(() => new Interface(vault.abi), [vault.abi]);

  /*
   * If no wallet is connected, use zero address for read calls.
   */
  const validAddress = useMemo(
    () => (walletAddress && isAddress(walletAddress) ? walletAddress : ZeroAddress),
    [walletAddress]
  );

  /*
   * Fetch all staking pools using Multicall.
   */
  const getStakingPools = useCallback(
    async (
      contract: Contract,
      vaultContract: Contract,
      mgoContract: Contract,
      stkContract: Contract,
      vaultConfig: { address: string; abi: any }
    ) => {
      const poolLength = await vaultContract.poolLength();

      if (Number(poolLength) === 0) {
        setPools([]);
        return;
      }

      /*
       * Fetch token metadata.
       */
      const mgoDecimals = await mgoContract.decimals();
      const stkTokenSymbol = await stkContract.symbol();
      const stkDecimals = await stkContract.decimals();

      /*
       * Fetch connected user's STK balance and allowance.
       */
      const userTokenBalance = await stkContract.balanceOf(validAddress);

      const userAllowance =
        validAddress !== ZeroAddress
          ? await stkContract.allowance(validAddress, vaultConfig.address)
          : 0n;

      /*
       * Prepare poolInfo multicalls.
       */
      const poolCalls = Array.from(
        { length: Number(poolLength) },
        (_, id) => ({
          target: vaultConfig.address,
          callData: intfce.encodeFunctionData("poolInfo", [id]),
        })
      );

      /*
       * Prepare userInfo multicalls.
       */
      const userInfoCalls = Array.from(
        { length: Number(poolLength) },
        (_, id) => ({
          target: vaultConfig.address,
          callData: intfce.encodeFunctionData("userInfo", [
            id,
            validAddress,
          ]),
        })
      );

      /*
       * Prepare pendingReward multicalls.
       */
      const pendingRewardCalls = Array.from(
        { length: Number(poolLength) },
        (_, id) => ({
          target: vaultConfig.address,
          callData: intfce.encodeFunctionData("pendingReward", [
            id,
            validAddress,
          ]),
        })
      );

      /*
       * Execute the three multicalls together.
       */
      const [
        poolsResponse,
        userInfoResponse,
        pendingRewardResponse,
      ] = await Promise.all([
        contract.aggregate.staticCall(poolCalls),
        contract.aggregate.staticCall(userInfoCalls),
        contract.aggregate.staticCall(pendingRewardCalls),
      ]);

      const [, poolsResult] = poolsResponse;
      const [, userInfoResult] = userInfoResponse;
      const [, pendingRewardResult] = pendingRewardResponse;

      /*
       * Decode returned bytes.
       */
      const decodedPools = poolsResult.map((result: string) =>
        intfce.decodeFunctionResult("poolInfo", result)
      );

      const decodedUserInfo = userInfoResult.map((result: string) =>
        intfce.decodeFunctionResult("userInfo", result)
      );

      const decodedPendingRewards = pendingRewardResult.map(
        (result: string) =>
          intfce.decodeFunctionResult("pendingReward", result)
      );

      /*
       * Convert blockchain values into frontend-friendly values.
       */
      const fetchedPools: PoolData[] = decodedPools.map(
        (pool: any, idx: number) => {
          const isEthPool = Boolean(pool.isEthPool);

          const decimals = isEthPool
            ? 18
            : Number(stkDecimals);

          return {
            poolId: idx,

            stakingTokenAddress: String(pool.stakingToken),

            rewardRatePerSecond: formatUnits(
              pool.rewardRatePerSecond,
              mgoDecimals
            ),

            lastRewardTime: Number(pool.lastRewardTime),

            accRewardPerShare:
              pool.accRewardPerShare.toString(),

            totalStaked: formatUnits(
              pool.totalStaked,
              decimals
            ),

            isEthPool,

            tokenSymbol: isEthPool
              ? "ETH"
              : stkTokenSymbol,

            tokenDecimals: decimals,

            userStakedAmount: formatUnits(
              decodedUserInfo[idx].amount,
              decimals
            ),

            userPendingReward: formatUnits(
              decodedPendingRewards[idx][0],
              mgoDecimals
            ),

            userAllowance: isEthPool
              ? "0"
              : formatUnits(
                  userAllowance,
                  stkDecimals
                ),

            /*
             * ETH balance is already displayed by the wallet
             * in the header. STK uses balanceOf().
             */
            userTokenBalance: isEthPool
              ? "0"
              : formatUnits(
                  userTokenBalance,
                  stkDecimals
                ),
          };
        }
      );

      setPools(fetchedPools);
    },
    [intfce, validAddress]
  );

  /*
   * Re-fetch pool information.
   */
  const refreshPools = useCallback(async () => {
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
      console.error("Failed to fetch pools:", err);

      setError(
        err?.shortMessage ||
          err?.reason ||
          err?.message ||
          "Failed to fetch staking pools."
      );
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
    refreshPools();
  }, [refreshPools, chainId, walletAddress]);

  /*
   * =========================================================
   * STAKE
   * =========================================================
   */

  const stakeTokens = async (
    poolId: number,
    amount: string,
    isEth: boolean
  ) => {
    if (!vaultContract) {
      throw new Error("Vault contract is not available.");
    }

    if (!stkContract) {
      throw new Error("STK contract is not available.");
    }

    if (!walletAddress) {
      throw new Error("Connect your wallet first.");
    }

    try {
      setError(null);

      /*
       * ETH POOL
       *
       * ETH is the native asset, therefore there is no approve().
       *
       * We convert:
       *
       * "0.1" ETH
       *
       * into wei using parseEther().
       */
      if (isEth) {
        const value = parseEther(amount);

        /*
         * The Solidity contract does this:
         *
         * if (pool.isEthPool) {
         *     _amount = msg.value;
         * }
         *
         * Therefore we send ETH through the transaction's
         * value field.
         *
         * _amount can be 0 because the contract replaces it
         * with msg.value.
         */
        const tx = await vaultContract.stake(
          poolId,
          0,
          {
            value,
          }
        );

        /*
         * Wait until the transaction is mined.
         */
        await tx.wait();
      } else {
        /*
         * ERC20 / STK POOL
         *
         * Convert human-readable STK to its smallest unit.
         */
        const decimals = await stkContract.decimals();

        const parsedAmount = parseUnits(
          amount,
          decimals
        );

        /*
         * Check how much STK the vault is currently
         * allowed to spend.
         */
        const allowance = await stkContract.allowance(
          walletAddress,
          vault.address
        );

        /*
         * If allowance is too small, approve first.
         */
        if (allowance < parsedAmount) {
          const approvalTx = await stkContract.approve(
            vault.address,
            parsedAmount
          );

          /*
           * VERY IMPORTANT:
           *
           * Wait for approval to be confirmed before
           * attempting stake().
           */
          await approvalTx.wait();
        }

        /*
         * Now the vault can transferFrom() the user's STK.
         */
        const stakeTx = await vaultContract.stake(
          poolId,
          parsedAmount
        );

        await stakeTx.wait();
      }

      /*
       * Transaction confirmed.
       * Refresh frontend values.
       */
      await refreshPools();
    } catch (err: any) {
      console.error("Stake failed:", err);

      const message =
        err?.code === 4001 ||
        err?.code === "ACTION_REJECTED"
          ? "Transaction rejected by user."
          : err?.shortMessage ||
            err?.reason ||
            err?.message ||
            "Failed to stake tokens.";

      setError(message);

      throw err;
    }
  };

  /*
   * =========================================================
   * WITHDRAW / UNSTAKE
   * =========================================================
   */

  const withdrawTokens = async (
    poolId: number,
    amount: string
  ) => {
    if (!vaultContract) {
      throw new Error("Vault contract is not available.");
    }

    try {
      setError(null);

      const pool = pools.find(
        (pool) => pool.poolId === poolId
      );

      if (!pool) {
        throw new Error("Pool not found.");
      }

      /*
       * Convert ETH/STK amount into its smallest unit.
       */
      const parsedAmount = parseUnits(
        amount,
        pool.tokenDecimals
      );

      const tx = await vaultContract.withdraw(
        poolId,
        parsedAmount
      );

      /*
       * Wait for blockchain confirmation.
       */
      await tx.wait();

      await refreshPools();
    } catch (err: any) {
      console.error("Withdraw failed:", err);

      const message =
        err?.code === 4001 ||
        err?.code === "ACTION_REJECTED"
          ? "Transaction rejected by user."
          : err?.shortMessage ||
            err?.reason ||
            err?.message ||
            "Failed to withdraw.";

      setError(message);

      throw err;
    }
  };

  /*
   * =========================================================
   * CLAIM REWARDS
   * =========================================================
   */

  const claimRewards = async (poolId: number) => {
    if (!vaultContract) {
      throw new Error("Vault contract is not available.");
    }

    try {
      setError(null);

      const tx = await vaultContract.claimReward(
        poolId
      );

      /*
       * Wait until RewardClaimed transaction is mined.
       */
      await tx.wait();

      await refreshPools();
    } catch (err: any) {
      console.error("Claim reward failed:", err);

      const message =
        err?.code === 4001 ||
        err?.code === "ACTION_REJECTED"
          ? "Transaction rejected by user."
          : err?.shortMessage ||
            err?.reason ||
            err?.message ||
            "Failed to claim rewards.";

      setError(message);

      throw err;
    }
  };

  /*
   * =========================================================
   * MINT TEST STK
   * =========================================================
   */

  const mintTestTokens = async () => {
    if (!stkContract) {
      throw new Error("STK contract is not available.");
    }

    try {
      setError(null);

      const decimals = await stkContract.decimals();

      /*
       * Mint 100 STK from MockERC20 faucet.
       */
      const amount = parseUnits(
        "100",
        decimals
      );

      const tx = await stkContract.faucet(
        amount
      );

      await tx.wait();

      await refreshPools();
    } catch (err: any) {
      console.error("Mint failed:", err);

      const message =
        err?.code === 4001 ||
        err?.code === "ACTION_REJECTED"
          ? "Transaction rejected by user."
          : err?.shortMessage ||
            err?.reason ||
            err?.message ||
            "Failed to mint test tokens.";

      setError(message);

      throw err;
    }
  };

  return {
    pools,
    isLoading,
    error,

    stakeTokens,
    withdrawTokens,
    claimRewards,
    mintTestTokens,

    refreshPools,
  };
};