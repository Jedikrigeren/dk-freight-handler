import { getConsignmentsListForPrint } from '../fragt-api-wrapper/GET-consignmentsListForPrintPDF.ts'
import { getLabelsForPrintPDF } from '../fragt-api-wrapper/GET-labelsForPrintPDF.ts'
import { createConsignment } from '../fragt-api-wrapper/POST-createConsignment.ts.ts'
import { getCustomers } from '../sap-api-wrapper/GET-CustomerData.ts'
import { getDeliveryNotes } from '../sap-api-wrapper/GET-DeliveryNotes.ts'
import { sendTeamsMessage } from '../teams_notifier/SEND-teamsMessage.ts'
import { mapSAPDataToDF } from './handleMappingData.ts'
import { printFileLinux } from './handlePrinting.ts'
import { savePDF } from './savePDF.ts'
import { deliveryAddressIsValid } from './utils.ts'

export async function iterateDeliveryNotes() {
  const deliveryNotes = await getDeliveryNotes()
  if (!deliveryNotes) {
    console.log('No delivery notes found')
    return
  }
  const customers = await getCustomers(deliveryNotes)
  if (!customers) {
    console.log('No customers found')
    return
  }

  const consignmentIDs: string[] = []

  for (const deliveryNote of deliveryNotes.value) {
    const customer = customers.value.find((customer) => customer.CardCode === deliveryNote.CardCode)
    if (!customer) {
      await sendTeamsMessage(
        'Customer number not found in SAP',
        `**Customer Number**: ${deliveryNote.CardCode} <BR>
        **Delivery Note Number**: ${deliveryNote.DocNum} <BR>`
      )
      continue
    }
    if (customer.ShippingType === 14) {
      await sendTeamsMessage(
        "Customer's shipping type is 14 which means they'll collect the goods themselves.",
        `**Customer Number**: ${customer.CardCode} <BR>
        **Customer Name**: ${customer.CardName} <BR>`
      )
      continue
    }
    if (!deliveryAddressIsValid(deliveryNote)) {
      console.log('Delivery address is not valid')
      continue
    }

    const consignmentData = mapSAPDataToDF(deliveryNote)
    if (consignmentData == undefined) {
      console.log('consignmentData has not been properly mapped')
      continue
    }

    const consignmentID = await createConsignment(consignmentData, deliveryNote.DocNum)
    if (!consignmentID) {
      console.log('Consignment creation failed')
      continue
    }

    consignmentIDs.push(consignmentID)

    // TODO: Should we just run through all the delivery notes after the labels have been printed, and then add track & trace to the deliveries in SAP?
    // TODO: Maybe we do need the field for checking if the delivery note has been processed or not
    /*
    const trackAndTraceUrl = await getTrackAndTraceUrl(consignmentID)
    if (!trackAndTraceUrl) {
      console.log('Track and trace url creation failed')
      continue
    }
    console.log(trackAndTraceUrl)
    */
  }

  if (consignmentIDs.length === 0) {
    console.log('No consignments created')
    return
  }

  const labelsPdfData = await getLabelsForPrintPDF(consignmentIDs)
  if (!labelsPdfData) {
    console.log('No labels found')
    return
  }
  const consignmentList = await getConsignmentsListForPrint(consignmentIDs)
  if (!consignmentList) {
    console.log('No consignment list found')
    return
  }

  const labelPath = await savePDF(labelsPdfData, 'labels')
  if (!labelPath) {
    console.log('Label path is undefined')
    return
  }

  const [printLabelStatus, printLabelOutput] = await printFileLinux(labelPath, 'FragtLabel') // TODO: Create env variable for printer names?
  console.log('Print label status: ', printLabelStatus)
  console.log('Print label output: ', printLabelOutput)

  const consignmentListPath = await savePDF(consignmentList, 'consignment_list')
  if (!consignmentListPath) {
    console.log('Consignment list path is undefined')
    return
  }
  const [printConsignmentListStatus, printConsignmentListOutput] = await printFileLinux(
    consignmentListPath,
    'Ineo3300i'
  ) // TODO: Create env variable for printer names?
  console.log('Print consignment list status: ', printConsignmentListStatus)
  console.log('Print consignment list output: ', printConsignmentListOutput)
}
