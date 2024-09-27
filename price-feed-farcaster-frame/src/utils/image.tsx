import satori from "satori";
import { join } from "path";
import * as fs from "fs";
import { formatLargeNumber } from ".";
import { envVars } from "@/constants/env";
import sharp from "sharp";

const font = fs.readFileSync(
    join(process.cwd(), "src/fonts/RedHatDisplayBlack.ttf")
);

const generatePriceImageSvg = async (
    ethPrice: number,
    btcPrice: number
): Promise<string> => {
    return await satori(
        <div
            style={{
                background: "rgba(13, 13, 15, 0.99)",
                backgroundImage: `url(${envVars.hostUrl}/images/background.png)`,
                backgroundRepeat: "no-repeat",
                backgroundSize: "100% 100%",
                display: "flex",
                flexDirection: "column",
                padding: "3.5rem",
                width: "100%",
                height: "100%",
                alignContent: "center",
                justifyContent: "space-between",
            }}
        >
            <div
                style={{
                    display: "flex",
                    justifyContent: "center",
                }}
            >
                <span
                    style={{
                        fontSize: "18px",
                        lineHeight: "23.81px",
                        fontWeight: "900",
                        color: "rgba(255, 255, 255, 1)",
                        textShadow:
                            "0 0 5px #13547a, 0 0 10px #13547a, 0 0 5px #13547a, 0 0 5px #13547a",
                    }}
                >
                    ETH and BTC Price
                </span>
            </div>
            <div
                style={{
                    display: "flex",
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "4rem",
                    width: "100%",
                    paddingBottom: "40px",
                }}
            >
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    <img
                        src={`${envVars.hostUrl}/images/eth.png`}
                        style={{ width: "60px", height: "60px" }}
                    />
                    <span
                        style={{
                            color: "rgba(255, 255, 255, 1)",
                            fontSize: "22px",
                            lineHeight: "29.11px",
                            fontWeight: "900",
                        }}
                    >
                        ${formatLargeNumber(ethPrice)}
                    </span>
                </div>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                    }}
                >
                    <img
                        src={`${envVars.hostUrl}/images/btc.png`}
                        style={{ width: "60px", height: "60px" }}
                    />
                    <span
                        style={{
                            color: "rgba(255, 255, 255, 1)",
                            fontSize: "22px",
                            lineHeight: "29.11px",
                            fontWeight: "900",
                        }}
                    >
                        {" "}
                        ${formatLargeNumber(btcPrice)}
                    </span>
                </div>
            </div>
            <div
                style={{
                    fontSize: "14px",
                    position: "absolute",
                    color: "rgba(255, 255, 255, 1)",
                    bottom: "40px",
                    right: "20px",
                }}
            >
                {new Date().toISOString()}
            </div>
        </div>,
        {
            width: 600,
            height: 400,
            fonts: [
                {
                    data: font,
                    name: "Red Hat Display Black",
                    style: "normal",
                },
            ],
        }
    );
};

export const generateBase64PriceImage = async (
    ethPrice: number,
    btcPrice: number
) => {
    const svg = await generatePriceImageSvg(ethPrice, btcPrice);
    return (await sharp(Buffer.from(svg)).toFormat("png").toBuffer()).toString(
        "base64"
    );
};
