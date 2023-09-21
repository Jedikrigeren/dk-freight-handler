import { AxiosError, AxiosResponse } from 'npm:axios@1.4.0'
import { getAuthorizedClient } from './POST-login.ts'
import { sendTeamsMessage } from '../teams_notifier/SEND-teamsMessage.ts'

export async function setTrackAndTraceUrl(
  trackAndTraceUrl: string,
  docEntry: number,
  deliveryNote: number,
  consignmentID: string
): Promise<AxiosResponse | void> {
  const authClient = await getAuthorizedClient()

  try {
    const res = await authClient.patch(`DeliveryNotes(${docEntry})`, {
      U_CCF_DF_TrackAndTrace: trackAndTraceUrl,
      //TODO: uncomment U_CCF_DF_FreightBooked: 'Y',
      U_CCF_DF_ConsignmentID: consignmentID,
    })

    return res.data
  } catch (error) {
    if (error instanceof AxiosError) {
      await sendTeamsMessage(
        'setTrackAndTraceUrl SAP request failed',
        `**DeliveryNote**: ${deliveryNote}<BR>
        **Code**: ${error.code}<BR>
          **Error Message**: ${JSON.stringify(error.response?.data)}<BR>
          **Body**: ${JSON.stringify(error.config)}<BR>`
      )
    }
  }
}
