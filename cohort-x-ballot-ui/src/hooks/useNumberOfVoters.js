import { useCallback, useEffect, useState } from "react";
import { wssProvider } from "../constants/providers";
import { ethers } from "ethers";

const useNumberOfVoters = () => {
    const [value, setValue] = useState(0);

    const eventListerner = useCallback(() => {
        setValue((prev) => prev + 1);
    }, []);

    useEffect(() => {
        const filter = {
            address: import.meta.env.VITE_ballot_contract_address,
            topics: [
                "0x02e8e9dbca99990e7fa2bd1a2cda8f76312b92ef3580255233e221484585545b",
            ],
        };

        wssProvider.getLogs({ ...filter, fromBlock: 5465128 }).then((logs) => {
            setValue(logs.length + 1);
        });

        const wssProvider2 = new ethers.WebSocketProvider(
            import.meta.env.VITE_wss_rpc_url
        );

        wssProvider2.on(filter, eventListerner);

        return () => wssProvider2.off(filter, eventListerner);
    }, [eventListerner]);

    return value;
};

export default useNumberOfVoters;
