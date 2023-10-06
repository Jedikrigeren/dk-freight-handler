import 'https://deno.land/std@0.195.0/dotenv/load.ts'
import { cron } from 'https://deno.land/x/deno_cron@v1.0.0/cron.ts'
import { logoutSap } from './sap-api-wrapper/POST-logout.ts'
import { handleCheckValidatedBusinessPartners } from './utils/handleCheckValidatedBusinessPartners.ts'
import { checkEnvs } from './utils/handleCheckingEnvs.ts'
import { iterateDeliveryNotes } from './utils/handleIterateDeliveries.ts'
import { validateBusinessPartners } from './utils/handleValidateBusinessPartners.ts'
import { validateOpenOrders } from './utils/handleValidateOpenOrders.ts'
import { iterateStockTransfers } from './utils/handleIterateStockTransfers.ts'
import { correctCasing } from './utils/utils.ts'

async function main() {
  // Github repo for running deno on Pi (Seemingly only works in the terminal you run the curl script and export in, but it works
  // https://github.com/LukeChannings/deno-arm64

  const result = checkEnvs()

  if (result.type == 'error') {
    console.log(result.error)
  } else {
    console.log(new Date(new Date().getTime()).toLocaleString() + ': Running the script before starting the scheduler')
    // Initial runs
    //await validateOpenOrders()
    //await iterateDeliveryNotes()
    //await iterateStockTransfers()
    //await handleCheckValidatedBusinessPartners()
    //await validateBusinessPartners()
    //await logoutSap()

    console.log(new Date(new Date().getTime()).toLocaleString() + ': Finished the initial runs')

    // VALIDATING BUSINESS PARTNERS
    cron('0 0 17 * * 1-5', async () => {
      try {
        console.log(new Date(new Date().getTime()).toLocaleString() + ': VALIDATING OPEN ORDERS')
        await handleCheckValidatedBusinessPartners()
        await validateBusinessPartners()
        console.log(new Date(new Date().getTime()).toLocaleString() + ': FINISHED VALIDATING OPEN ORDERS')
        await logoutSap()
      } catch (error) {
        console.log(error)
      }
    })

    // VALIDATING OPEN ORDERS
    cron('0 */10 7-17 * * 1-5', async () => {
      try {
        console.log(new Date(new Date().getTime()).toLocaleString() + ': VALIDATING OPEN ORDERS')
        await validateOpenOrders()
        console.log(new Date(new Date().getTime()).toLocaleString() + ': FINISHED VALIDATING OPEN ORDERS')
        await logoutSap()
      } catch (error) {
        console.log(error)
      }
    })
    // BOOKING FREIGHT AND PRINTING LABELS
    cron('*/30 */1 7-15 * * 1-5', async () => {
      try {
        console.log(new Date(new Date().getTime()).toLocaleString() + ': BOOKING FREIGHT AND PRINTING LABELS')
        await iterateDeliveryNotes()
        await iterateStockTransfers()
        console.log(new Date(new Date().getTime()).toLocaleString() + ': FINISHED BOOKING FREIGHT AND PRINTING LABELS')
        await logoutSap()
      } catch (error) {
        console.log(error)
      }
    })

    // CONSIGNMENT LISTS WILL BE HANDLED DIFFERENTLY
    // PRINTING CONSIGNMENT LIST
    //cron('0 */10 12-15 * * 1-5', async () => {
    //  console.log(new Date(new Date().getTime()).toLocaleString() + ': PRINTING CONSIGNMENT LIST')
    //  await printConsignmentList()
    //  console.log(new Date(new Date().getTime()).toLocaleString() + ': FINISHED PRINTING CONSIGNMENT LIST')
    //})

    // EMPTYING THE CONSIGNMENT LIST TXT TILES
    //cron('0 0 20 * * 1-5', async () => {
    //  console.log(new Date(new Date().getTime()).toLocaleString() + ': EMPTYING THE CONSIGNMENT LIST TXT TILES')
    //  await emptyConsignmentLists()
    //  console.log(new Date(new Date().getTime()).toLocaleString() + ': FINISHED EMPTYING THE CONSIGNMENT LIST TXT TILES')
    //})
  }
}

main()
