import { useEffect, useMemo, useState } from "react";
import { useContract } from "./useContract";
import tokenList from "../tokenlist.json";
import erc20abi from "../abi/ecr20.json";
import { Interface, isAddress, ZeroAddress } from "ethers";

export const useTokensAndBalance = (address) => {
  const { getContract } = useContract();
  const [tokens, setTokens] = useState([]);

  const mainnetTokens = tokenList.tokens.filter((token) => token.chainId === 1);

  const tokenAddreses = useMemo(
    () => mainnetTokens.map((token) => token.address),
    []
  );

  const validAddress = useMemo(() =>
    isAddress(address) ? address : ZeroAddress
  );

  const intfce = useMemo(() => new Interface(erc20abi), []);

  // define the calls
  const calls = useMemo(
    () =>
      tokenAddreses.map((address) => ({
        target: address,
        callData: intfce.encodeFunctionData("balanceOf", [validAddress]),
      })),
    [intfce, tokenAddreses, validAddress]
  );

  //make the aggregate call
  useEffect(() => {
    const run = async () => {
      const contract = getContract(false);
      console.log("Contract:: ", contract);

      if (!contract) {
        return;
      }

      console.log("Contract:: ", contract);

      const [_, balancesResult] = await contract.aggregate.staticCall(calls);

      const decodedBalances = balancesResult.map((result) =>
        intfce.decodeFunctionResult("balanceOf", result).toString()
      );

      const tokenWithBalances = mainnetTokens.map((token, idx) => ({
        ...token,
        balance: decodedBalances[idx],
      }));

      setTokens(tokenWithBalances);
    };

    run();
  }, [validAddress, getContract]);

  return {
    tokens,
    address,
  };
};
