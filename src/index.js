// ////////////////////////////////////////////////////////////// //
// ////////////////////////////////////////////////////////////// //
//                                                                //
//               USE AT YOUR OWN RISK!!!!                         //
//                                                                //
// ////////////////////////////////////////////////////////////// //
//                                                                //
//   The following is sample code provided for educational        //
//   purposes.                                                    //
//                                                                //
// ////////////////////////////////////////////////////////////// //
//                                                                //
//   Required environment variables :                             //
//        OCEAN_API_KEY                                           //
//        OCEAN_API_SECRET                                        //
//        BOT_ADDRESS                                             //
//                                                                //
// ////////////////////////////////////////////////////////////// //

import createOcean from 'the-ocean-x'
import Web3 from 'web3'

let position = 'in'

const update = async () => {
  const web3Url = process.env.WEB3_URL || 'http://localhost:8545'
  const provider = new Web3.providers.HttpProvider(web3Url)

  let ocean = await createOcean({
    api: {
      key: process.env.OCEAN_API_KEY,
      secret: process.env.OCEAN_API_SECRET,
      baseURL: 'https://kovan.theoceanx.com/api/v0'
    },
    web3Provider: provider
  })

  const pairs = await ocean.marketData.tokenPairs()
  const myPair = pairs[0]
  const Q = 5

  // Get historical price data for the period of time that we
  // are taking the moving average over
  const startTime = parseInt(Date.now() / 1000 - 3600 * (Q + 1))
  const endTime = parseInt((Date.now() / 1000) - 10)
  const interval = 3600
  const candlesticks = await ocean.marketData.candlesticks({
    baseTokenAddress: myPair.baseToken.address,
    quoteTokenAddress: myPair.quoteToken.address,
    startTime,
    endTime,
    interval
  })

  // Calculate the moving average for this moment in time.
  let sum = 0
  for (let i = 1; i < Q + 1; i++) {
    sum = sum + candlesticks[candlesticks.length - i].close
  }
  const movingAverage = sum / Q

  // Get the last trading price
  const ticker = await ocean.marketData.ticker({
    baseTokenAddress: myPair.baseToken.address,
    quoteTokenAddress: myPair.quoteToken.address
  })
  const last = ticker.last

  // compare the last price to the moving average and change the
  // current position if approriate.
  if (last > movingAverage && position === 'out') {
    // buy up as much as you can
    const quoteBalance = await ocean.wallet.getTokenBalance({
      etherAddress: process.env.BOT_ADDRESS,
      tokenAddress: myPair.quoteToken.address
    })

    // This is an approximation of the most we can buy
    const baseAmountToBuy = quoteBalance.div(last).times(0.95)

    console.log(await ocean.trade.newMarketOrder({
      baseTokenAddress: myPair.baseToken.address,
      quoteTokenAddress: myPair.quoteToken.address,
      side: 'buy',
      orderAmount: baseAmountToBuy,
      feeOption: 'feeInNative'
    }))
    position = 'in'
  } else if (position === 'in') {
    // sell off everything you can
    const baseBalance = await ocean.wallet.getTokenBalance({
      etherAddress: process.env.BOT_ADDRESS,
      tokenAddress: myPair.baseToken.address
    })
    console.log(await ocean.trade.newMarketOrder({
      baseTokenAddress: myPair.baseToken.address,
      quoteTokenAddress: myPair.quoteToken.address,
      side: 'sell',
      orderAmount: baseBalance,
      feeOption: 'feeInNative'
    }))
    position = 'out'
  }
}
setInterval(update, 3600 * 1000)
