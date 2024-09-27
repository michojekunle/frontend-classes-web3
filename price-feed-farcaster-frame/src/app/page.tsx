import { Metadata } from "next";
import { envVars } from "../constants/env";

export const metadata: Metadata = {
    title: "Price Feed Farcaster Frame",
    description: "ETH & BTC Price Feed Farcaster Frame",
    openGraph: {
        title: "Price Feed Farcaster Frame",
        description: "ETH & BTC Price Feed Farcaster Frame",
        images: [`${envVars.hostUrl}/images/base.png`],
    },
    other: {
        "fc:frame": "vNext",
        "fc:frame:image": `${envVars.hostUrl}/images/base.png`,
        "fc:frame:post_url": `${envVars.hostUrl}/api/price`,
        "fc:frame:button:1": "Get Price",
    },
};
export default function Home() {
    return (
        <main>
            <h1 className="text-4xl font-bold">
                ETH & BTC Price Feed Farcaster Frame
            </h1>
            <p>
                Built by{" "}
                <a href="https://warpcast.com/0xadek" target="_blank">
                    0xadek
                </a>
            </p>
        </main>
    );
}
