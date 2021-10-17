import { ContractKit } from "@celo/contractkit"
import BigNumber from "bignumber.js"
import { IUniswapV2Factory, ABI as FactoryABI } from "../../types/web3-v1-contracts/IUniswapV2Factory"
import { IUniswapV2Pair, ABI as PairABI } from "../../types/web3-v1-contracts/IUniswapV2Pair"
import { Address, PairXYeqK } from "../pair"
import { address as pairUniswapV2Address } from "../../tools/deployed/mainnet.PairUniswapV2.addr.json"
import { selectAddress } from "../utils"

export class PairUniswapV2 extends PairXYeqK {
	allowRepeats = false

	private factory: IUniswapV2Factory
	private pair?: IUniswapV2Pair
	private pairToken0?: Address

	constructor(
		private kit: ContractKit,
		factoryAddr: Address,
		public readonly tokenA: Address,
		public readonly tokenB: Address,
		private fixedFee: BigNumber = new BigNumber(0.997),
	) {
		super(tokenA, tokenB)
		this.factory = new kit.web3.eth.Contract(FactoryABI, factoryAddr) as unknown as IUniswapV2Factory
	}

	protected async _init() {
		const pairAddr = await this.factory.methods.getPair(this.tokenA, this.tokenB).call()
		if (pairAddr === "0x0000000000000000000000000000000000000000") {
			throw new Error(`pair: ${this.tokenA}/${this.tokenB} doesn't exist!`)
		}
		this.pair = new this.kit.web3.eth.Contract(PairABI, pairAddr) as unknown as IUniswapV2Pair
		this.pairToken0 = await this.pair.methods.token0().call()
		return {
			swappaPairAddress: await selectAddress(this.kit, {mainnet: pairUniswapV2Address})
		}
	}

	public async refresh(): Promise<void> {
		if (!this.pair) {
			throw new Error(`not initialized!`)
		}
		const reserves = await this.pair.methods.getReserves().call()
		const [bucketA, bucketB] = this.pairToken0 === this.tokenA ? [reserves[0], reserves[1]] : [reserves[1], reserves[0]]
		this.refreshBuckets(this.fixedFee, new BigNumber(bucketA), new BigNumber(bucketB))
	}

	protected swapExtraData() {
		return this.pair!.options.address
	}
}