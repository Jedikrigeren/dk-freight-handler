import { AxiosError, AxiosResponse } from 'npm:axios@1.4.0'
import { getAuthorizedClient } from './POST-login.ts'
import { sendTeamsMessage } from '../teams_notifier/SEND-teamsMessage.ts'

export async function setAddressValidation(docEntry: number, order: number, validationString: string): Promise<AxiosResponse | void> {
  const authClient = await getAuthorizedClient()

  if (validationString.length > 100) {
    sendTeamsMessage(
      "Validationstring is more than 100 chars, it's truncated",
      `**Order**: ${order}<BR>
      **ValidationString**: ${validationString}<BR>`
    )
    validationString = validationString.substring(0, 100)
  }

  try {
    const res = await authClient.patch(`Orders(${docEntry})`, {
      U_CCF_DF_AddressValidation: validationString,
    })

    return res.data
  } catch (error) {
    if (error instanceof AxiosError) {
      sendTeamsMessage(
        'setAddressValidation SAP request failed',
        `**Order**: ${order}<BR>
        **Code**: ${error.code}<BR>
          **Error Message**: ${JSON.stringify(error.response?.data)}<BR>
          **Body**: ${JSON.stringify(error.config)}<BR>`
      )
    }
  }
}
