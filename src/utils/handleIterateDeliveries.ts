import { getTrackAndTraceUrl } from '../fragt-api-wrapper/GET-TrackAndTraceUrl.ts'
import { createConsignment } from '../fragt-api-wrapper/POST-createConsignment.ts.ts'
import { getAllValidatedDeliveryNotes } from '../sap-api-wrapper/GET-DeliveryNotes.ts'

import { setTrackAndTraceUrl } from '../sap-api-wrapper/PATCH-SetTrackAndTrace.ts'
import { sendTeamsMessage } from '../teams_notifier/SEND-teamsMessage.ts'
import { mapSAPDataToDF } from './handleMappingData.ts'
import { saveConsignmentIds } from './saveConsignmentIds.ts'
import { deliveryAddressIsValid } from './utils.ts'

export async function iterateDeliveryNotes() {
  const deliveryNotes = await getAllValidatedDeliveryNotes()

  console.log('deliveryNotes:', deliveryNotes)

  if (!deliveryNotes) {
    return
  } else if (deliveryNotes.value.length === 0) {
    return
  }

  console.log('amount of deliveryNotes:', deliveryNotes.value.length)

  const consignmentIDs: string[] = []

  for (const deliveryNote of deliveryNotes.value) {
    console.log('deliveryNote:', deliveryNote.DocNum)

    if (deliveryNote.U_CCF_DF_FreightBooked === 'P') {
      if (deliveryNote.U_CCF_DF_ConsignmentID == undefined) {
        await sendTeamsMessage(
          'Trying to Print Label again, but no consignment ID is on order',
          `**Customer Number**: ${deliveryNote.CardCode} <BR>
          **Delivery Note Number**: ${deliveryNote.DocNum} <BR>`
        )
        continue
      }
      consignmentIDs.push(deliveryNote.U_CCF_DF_ConsignmentID)
      continue
    }

    if (deliveryNote.AddressExtension.ShipToCountry !== 'DK') {
      continue
    }

    if (!deliveryAddressIsValid(deliveryNote)) {
      await sendTeamsMessage(
        'Delivery address is not valid',
        `**Customer Number**: ${deliveryNote.CardCode} <BR>
        **Delivery Note Number**: ${deliveryNote.DocNum} <BR>`
      )
      continue
    }

    const consignmentData = mapSAPDataToDF(deliveryNote)
    if (consignmentData == undefined) {
      await sendTeamsMessage(
        'Mapping of SAP data to DF data failed',
        `**Customer Number**: ${deliveryNote.CardCode} <BR>
        **Delivery Note Number**: ${deliveryNote.DocNum} <BR>`
      )
      continue
    }

    const consignmentID = await createConsignment(consignmentData, deliveryNote.DocNum)
    if (!consignmentID) {
      continue
    }
    consignmentIDs.push(consignmentID)

    const trackAndTraceUrl = await getTrackAndTraceUrl(consignmentID, deliveryNote.DocNum)
    if (!trackAndTraceUrl) {
      continue
    }

    await setTrackAndTraceUrl(trackAndTraceUrl, deliveryNote.DocEntry, deliveryNote.DocNum, consignmentID)
  }

  if (consignmentIDs.length === 0) {
    console.log('No consignmentIDs to save')
    return
  }

  await saveConsignmentIds(consignmentIDs, 'consignmentIDs')

  return
  // TODO: Send consignmentIDs to a txt file
  // TODO: We should check if there are any more open orders that needs to be booked
  // If everything is booked we should print the consignment list
  // If they time is after 13.30?? we should print the consignment list
  /*
  const labelsPdfData = await getLabelsForPrintPDF(consignmentIDs)
  if (!labelsPdfData) {
    return
  }

  const labelPath = await savePDF(labelsPdfData, 'labels')
  if (!labelPath) {
    return
  }

  const labelPrinterName = Deno.env.get('PI_PRINTER_NAME_LABEL')
  if (!labelPrinterName) {
    await sendTeamsMessage('Label printer name is undefined', `Please set the environment variable PI_PRINTER_NAME_LABEL <BR>`)
    return
  }

  const printLabel = await printFileLinux(labelPath, labelPrinterName)
  if (!printLabel) {
    return
  }
  */
}
