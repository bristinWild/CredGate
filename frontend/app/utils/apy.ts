export function calculateAPY(ratePerBlock: number, blocksPerYear = 2102400) {
    return (Math.pow(1 + ratePerBlock, blocksPerYear) - 1) * 100;
}