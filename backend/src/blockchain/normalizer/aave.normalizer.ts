export class AaveNormalizer {
    static async attachTimestamps(events: any[], provider: any) {
        const uniqueBlocks = [
            ...new Set(events.map((e) => e.blockNumber)),
        ];

        const blocks = await Promise.all(
            uniqueBlocks.map((blockNumber) =>
                provider.getBlock(blockNumber),
            ),
        );

        const blockMap = new Map(
            blocks.map((b) => [b.number, b.timestamp]),
        );

        return events.map((event) => ({
            ...event,
            timestamp: blockMap.get(event.blockNumber),
        }));
    }

    static async normalizeBorrow(events: any[], provider: any) {
        const enriched = await this.attachTimestamps(events, provider);

        return enriched.map((event) => ({
            type: 'BORROW',
            asset: event.args.reserve,
            amount: event.args.amount.toString(),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: event.timestamp,
        }));
    }

    static async normalizeRepay(events: any[], provider: any) {
        const enriched = await this.attachTimestamps(events, provider);

        return enriched.map((event) => ({
            type: 'REPAY',
            asset: event.args.reserve,
            amount: event.args.amount.toString(),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: event.timestamp,
        }));
    }

    static async normalizeLiquidation(events: any[], provider: any) {
        const enriched = await this.attachTimestamps(events, provider);

        return enriched.map((event) => ({
            type: 'LIQUIDATION',
            collateralAsset: event.args.collateralAsset,
            debtAsset: event.args.debtAsset,
            debtCovered: event.args.debtToCover.toString(),
            txHash: event.transactionHash,
            blockNumber: event.blockNumber,
            timestamp: event.timestamp,
        }));
    }
}