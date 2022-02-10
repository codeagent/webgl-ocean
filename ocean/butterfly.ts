import { complex, Complex, eix } from '../complex';

export interface BatterflyNode {
  indices: number[];
  even?: BatterflyNode;
  odd?: BatterflyNode;
}
export type ButterflyEntry = [number, number, Complex];
export type ButterflyTier = ButterflyEntry[];

export const makeBatterflyTree = (indices: number[]) => {
  const node: BatterflyNode = { indices: [...indices] };

  if (indices.length > 2) {
    const n = indices.length;
    const even = new Array<number>(n / 2);
    const odd = new Array<number>(n / 2);

    for (let i = 0, e = 0, o = 0; i < n; i++) {
      if (i % 2 === 0) {
        even[e++] = indices[i];
      } else {
        odd[o++] = indices[i];
      }
    }

    node.even = makeBatterflyTree(even);
    node.odd = makeBatterflyTree(odd);
  }

  return node;
};

export const makeButterfly = (root: BatterflyNode): ButterflyTier[] => {
  const queue: BatterflyNode[] = [root];
  const tiers = new Array<ButterflyTier>(Math.log2(root.indices.length));

  // Breadth-first
  while (queue.length) {
    const node = queue.shift();
    const size = node.indices.length;
    const tierId = Math.log2(size) - 1;

    const w = (-2 * Math.PI) / size;
    const tier = (tiers[tierId] = tiers[tierId] ?? []);

    if (tierId === 0) {
      tier.push([node.indices[0], node.indices[1], complex(1, 0)]);
      tier.push([node.indices[0], node.indices[1], eix(w)]);
    } else {
      const offset = tier.length;

      const n2 = size / 2;

      for (let k = 0; k < size; k++) {
        tier.push([offset + (k % n2), offset + (k % n2) + n2, eix(w * k)]);
      }

      queue.push(node.even);
      queue.push(node.odd);
    }
  }

  return tiers;
};
