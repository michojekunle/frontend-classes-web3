import {
  readContract,
  writeContract,
  waitForTransactionReceipt,
} from "@wagmi/core";
import { useEffect } from "react";
import { parseUnits } from "viem";
import { config } from "./wagmi";
import abi from "./abi/mgo.json";
import ConnectButton from "./ConnectButton";
import { useAppKitAccount } from "@reown/appkit/react";

function App() {
  const { address, isConnected } = useAppKitAccount();

  async function getContractTokenSupplyAndMint(address: string) {
    console.log("READInG FROM CONTRACTTTTTT");
    const result = await readContract(config, {
      abi,
      address: "0xEfF517687753FFEc4b0536a735a06FD9EB1094b3",
      functionName: "totalSupply",
    });

    console.log("TotalSupply: ", (result as any).data);
    console.log("TotalSupply: ", result);

    const mintTx = await writeContract(config, {
      abi,
      address: "0xEfF517687753FFEc4b0536a735a06FD9EB1094b3",
      functionName: "mint",
      args: [
        "0xA711CEA2F1c571BbEEaB06Efd7dA8c660E7D6eA3",
        parseUnits("300", 18),
      ],
    });

    console.log("Mint tx hash", mintTx);

    const resultingMintTx = await waitForTransactionReceipt(config, {
      hash: mintTx,
    });

    console.log("resulting transaction payload: ", resultingMintTx);
  }

  useEffect(() => {
    console.log("useeffect running");
    if (address) {
      console.log("Proceeding to reading from contract");
      getContractTokenSupplyAndMint(address);
    }
  }, [address]);

  return (
    <>
      <ConnectButton />
      <p>Connected Address: {address}</p>
    </>
  );
}

export default App;
