import { useEffect } from "react";
import ConnectButton from "./components/ConnectButton";
import { useWalletConnection } from "./hooks/useWalletConnection";

function App() {
  const { account, chainId, getBalance, balance } = useWalletConnection();
  
  useEffect(() => {
    getBalance()
  }, [account])

  return (
    <div>
      <h1 style={{ margin: "20px" }}>EIP 1193</h1>
      {account && (
        <>
          <p>Account: {account}</p>
        </>
      )}
      {chainId && (
        <>
          <p>Chainid: {chainId}</p>
        </>
      )}

      {balance && (
        <>
          <p>Balance: {balance}</p>
        </>
      )}
      <ConnectButton />
    </div>
  );
}

export default App;
