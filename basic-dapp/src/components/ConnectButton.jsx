import { useWalletConnection } from "../hooks/useWalletConnection";

const ConnectButton = () => {
  const { account, connectWallet, disconnectWallet } = useWalletConnection();
  return (
    <>
      {account ? (
        <button onClick={disconnectWallet}>Disconnect</button>
      ) : (
        <button onClick={connectWallet}>Connect</button>
      )}
    </>
  );
};

export default ConnectButton;
