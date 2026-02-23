import { Injectable } from "@nestjs/common";
import axios from "axios";

@Injectable()
export class AaveService {
    constructor() {
        if (!process.env.GRAPH_API_KEY) {
            throw new Error("GRAPH_API_KEY not defined");
        }
    }
    private SUBGRAPH_URL =
        "https://gateway.thegraph.com/api/" +
        process.env.GRAPH_API_KEY +
        "/subgraphs/id/JCNWRypm7FYwV8fx5HhzZPSFaMxgkPuw4TnR3Gpi81zk";

    private async fetchAllEvents(entity: string, address: string) {
        const lower = address.toLowerCase();
        const pageSize = 1000;
        let skip = 0;
        let all: any[] = [];




        while (true) {
            const query = `
                {
                ${entity}(
                    where: { account_: { id: "${lower}" } }
                    first: ${pageSize}
                    skip: ${skip}
                    orderBy: timestamp
                    orderDirection: desc
                ) {
                    id
                    amount
                    timestamp
                }
                }
                `;



            const response = await axios.post(this.SUBGRAPH_URL, { query });
            if (response.data.errors) {

                throw new Error("Graph query failed");
            }

            const data = response.data.data[entity];


            all.push(...data);

            if (data.length < pageSize) break;
            skip += pageSize;
        }

        return all;
    }

    private async fetchLiquidations(address: string) {
        const lower = address.toLowerCase();
        const pageSize = 1000;
        let skip = 0;
        let all: any[] = [];

        while (true) {
            const query = `
        {
          liquidates(
            where: { liquidatee_: { id: "${lower}" } }
            first: ${pageSize}
            skip: ${skip}
            orderBy: timestamp
            orderDirection: desc
          ) {
            id
            timestamp
            liquidator { id }
          }
        }
        `;

            const response = await axios.post(this.SUBGRAPH_URL, { query });
            const data = response.data?.data?.liquidates ?? [];

            all.push(...data);

            if (data.length < pageSize) break;
            skip += pageSize;
        }

        return all;
    }


    async getUserAaveActivity(address: string) {
        const borrows = await this.fetchAllEvents("borrows", address);
        const repays = await this.fetchAllEvents("repays", address);
        const liquidations = await this.fetchLiquidations(address);

        return {
            borrows,
            repays,
            liquidations
        };
    }


}