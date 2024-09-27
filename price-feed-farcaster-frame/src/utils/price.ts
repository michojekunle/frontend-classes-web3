import { envVars } from "@/constants/env";

import axios from "axios";
const endpoint = `https://gateway-arbitrum.network.thegraph.com/api/${envVars.subgraphApiKey}/subgraphs/id/5zvR82QoaXYFyDEKLZ9t6v9adgnptxYpKpSbxtgVENFV`;
const headers = {
    "content-type": "application/json",
};

const graphqlQuery = {
    query: `query Price($WBTCAddress: String!) {
        bundle(id: "1") {
            ethPriceUSD
        }
        token(id: $WBTCAddress) {
            derivedETH
        }
    }`,
    variables: {
        WBTCAddress: envVars.WBTC_ADDRESS,
    },
};
export const getPrices = async () => {
    const response = await axios.post(endpoint, graphqlQuery, { headers });
    if (response.data.error) {
        throw new Error(response.data.error.message);
    }
    return {
        eth: Number(response.data.data.bundle.ethPriceUSD),
        btc:
            Number(response.data.data.token.derivedETH) *
            Number(response.data.data.bundle.ethPriceUSD),
    };
};
