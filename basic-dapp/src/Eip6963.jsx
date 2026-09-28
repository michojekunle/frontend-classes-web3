import { useEffect, useState } from "react";

const Eip6963 = () => {
  const [providers, setProviders] = useState([]);
  const [account, setAccount] = useState("");
  const [chainId, setChainId] = useState(0);

  useEffect(() => {
    const requestEvent = new Event("eip6963:requestProvider");

    window.dispatchEvent(requestEvent);

    window.addEventListener("eip6963:announceProvider", (event) => {
      console.log("Provider: ", event.detail);
      setProviders((providers) => [...providers, event.detail]);
    });
  }, []);

  const handleConnectWallet = async (provider) => {
    console.log(provider);
    try {
      if (provider) {
        const accounts = await provider.request({
          method: "eth_requestAccounts",
        });
        setAccount(accounts[0]);

        const chainId = await provider.request({ method: "eth_chainId" });
        setChainId(parseInt(chainId, 16));
      }
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div>
      {providers.map((provider) => (
        <div style={{ display: "flex", gap: "10px" }}>
          <img
            src={provider.info.icon}
            alt={provider.info.name}
            width={50}
            height={50}
          />
          <p>{provider.info.name}</p>
          <button onClick={() => handleConnectWallet(provider.provider)}>
            connect {provider.info.name}
          </button>
        </div>
      ))}

      {account && (
        <div>
          <h2>Connected Established</h2>

          <p>Account Connected: {account}</p>
          <p>Chain connected: {chainId}</p>
        </div>
      )}
    </div>
  );
};

export default Eip6963;
