import * as liquidity from './liquidity';
import * as swap from './swap';

const HyperionRouter = {
  ...liquidity,
  ...swap,
};

export default HyperionRouter;
