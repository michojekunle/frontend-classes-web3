import { useEffect, useState, useMemo, useCallback } from "react";
import { CONTRACTS } from "../contracts/stakingConfig";
import { PoolData } from "../types/staking";
import { useContract } from "./useContract";
import { useWalletConnection } from "./useWalletConnection";
import {
  Contract,
  formatUnits,
  parseUnits,
  Interface,
  isAddress,
  ZeroAddress,
} from "ethers";

export type TxStatus =
  | "idle"
  | "awaiting-wallet"   // MetaMask popup open, user hasn't signed yet
  | "pending"           // TX broadcast, waiting for 1 confirmation
  | "confirmed"         // TX mined
  | "error";            // user rejected or chain error

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
  const [error, setError] = useState(false);

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
    []
  );

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
    []
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

  // ─── Per-action TX status ────────────────────────────────────────────────
  const [txStatus, setTxStatus] = useState<TxStatus>("idle");
  const [txError, setTxError] = useState<string | null>(null);

  const resetTx = () => {
    setTxStatus("idle");
    setTxError(null);
  };

  // ─── Helper: signer-connected vault contract ──────────────────────────────
  const getSignerVault = useCallback(() => {
    if (!validateChainId()) return null;
    return getContract(vault.address, vault.abi, true) ?? null;
  }, [getContract, validateChainId, vault]);

  // ─── Helper: signer-connected STK ERC-20 contract ────────────────────────
  const getSignerStk = useCallback(() => {
    if (!validateChainId()) return null;
    return getContract(stk.address, stk.abi, true) ?? null;
  }, [getContract, validateChainId, stk]);

  // ─── Helper: refresh pools after a successful TX ──────────────────────────
  const refreshPools = useCallback(async () => {
    if (
      !vaultContract ||
      !multicall2Contract ||
      !mgoContract ||
      !stkContract ||
      !isSupportedChain
    )
      return;
    try {
      await getStakingPools(
        multicall2Contract,
        vaultContract,
        mgoContract,
        stkContract,
        vault
      );
    } catch (_) {
      // best-effort refresh
    }
  }, [
    vaultContract,
    multicall2Contract,
    mgoContract,
    stkContract,
    isSupportedChain,
    vault,
    getStakingPools,
  ]);

  // ─── stakeTokens ─────────────────────────────────────────────────────────
  const stakeTokens = async (
    poolId: number,
    amount: string,
    isEth: boolean
  ) => {
    resetTx();
    const signerVault = getSignerVault();
    if (!signerVault) return;

    try {
      // Decide the token decimals (ETH always 18, ERC-20 uses pool decimals)
      const decimals = isEth ? 18 : pools[poolId]?.tokenDecimals ?? 18;
      const parsed = parseUnits(amount, decimals);

      if (!isEth) {
        // ── ERC-20 flow: check allowance, approve if needed ──────────────
        const stkSigner = getSignerStk();
        if (!stkSigner) return;

        const signerAddress = address ?? ZeroAddress;
        const currentAllowance: bigint = await stkContract!.allowance(
          signerAddress,
          vault.address
        );

        if (currentAllowance < parsed) {
          setTxStatus("awaiting-wallet");
          const approveTx = await stkSigner.approve(vault.address, parsed);
          setTxStatus("pending");
          await approveTx.wait(1);
        }
      }

      // ── Send stake TX ─────────────────────────────────────────────────
      setTxStatus("awaiting-wallet");
      const tx = isEth
        ? await signerVault.stake(poolId, 0, { value: parsed })
        : await signerVault.stake(poolId, parsed);

      setTxStatus("pending");
      await tx.wait(1);

      setTxStatus("confirmed");
      await refreshPools();
    } catch (err: any) {
      setTxStatus("error");
      const msg =
        err?.reason ?? err?.shortMessage ?? err?.message ?? "Transaction failed";
      setTxError(msg);
      console.error("stakeTokens error:", err);
    }
  };

  // ─── withdrawTokens ───────────────────────────────────────────────────────
  const withdrawTokens = async (poolId: number, amount: string) => {
    resetTx();
    const signerVault = getSignerVault();
    if (!signerVault) return;

    try {
      const decimals = pools[poolId]?.tokenDecimals ?? 18;
      const parsed = parseUnits(amount, decimals);

      setTxStatus("awaiting-wallet");
      const tx = await signerVault.withdraw(poolId, parsed);

      setTxStatus("pending");
      await tx.wait(1);

      setTxStatus("confirmed");
      await refreshPools();
    } catch (err: any) {
      setTxStatus("error");
      const msg =
        err?.reason ?? err?.shortMessage ?? err?.message ?? "Transaction failed";
      setTxError(msg);
      console.error("withdrawTokens error:", err);
    }
  };

  // ─── claimRewards ─────────────────────────────────────────────────────────
  const claimRewards = async (poolId: number) => {
    resetTx();
    const signerVault = getSignerVault();
    if (!signerVault) return;

    try {
      setTxStatus("awaiting-wallet");
      const tx = await signerVault.claimReward(poolId);

      setTxStatus("pending");
      await tx.wait(1);

      setTxStatus("confirmed");
      await refreshPools();
    } catch (err: any) {
      setTxStatus("error");
      const msg =
        err?.reason ?? err?.shortMessage ?? err?.message ?? "Transaction failed";
      setTxError(msg);
      console.error("claimRewards error:", err);
    }
  };

  // ─── mintTestTokens ───────────────────────────────────────────────────────
  const mintTestTokens = async () => {
    resetTx();
    if (!validateChainId()) return;
    const stkSigner = getSignerStk();
    if (!stkSigner) return;

    try {
      setTxStatus("awaiting-wallet");
      const tx = await stkSigner.faucet();

      setTxStatus("pending");
      await tx.wait(1);

      setTxStatus("confirmed");
      await refreshPools();
    } catch (err: any) {
      setTxStatus("error");
      const msg =
        err?.reason ?? err?.shortMessage ?? err?.message ?? "Transaction failed";
      setTxError(msg);
      console.error("mintTestTokens error:", err);
    }
  };

  return {
    pools,
    isLoading,
    error,
    txStatus,
    txError,
    resetTx,
    stakeTokens,
    withdrawTokens,
    claimRewards,
    mintTestTokens,
  };
};
