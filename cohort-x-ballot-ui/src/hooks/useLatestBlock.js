import { useEffect, useState } from "react";
import { wssProvider } from "../constants/providers";

export function useLatestBlock() {
    const [blockNumber, setBlockNumber] = useState(undefined);
    useEffect(() => {
        const onBlock = (newBlockNumber) => setBlockNumber(newBlockNumber);
        wssProvider.on("block", onBlock);
        return () => {
            wssProvider.off("block", onBlock);
        };
    }, []);

    return blockNumber;
}
