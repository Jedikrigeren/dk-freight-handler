import { AxiosError } from 'npm:axios@^1.4.0'
import { getDFSession } from './POST-login.ts'
import { sendTeamsMessage } from '../teams_notifier/SEND-teamsMessage.ts'

export async function getConsignmentsListForPrint(consignmentNumbers: string[]): Promise<void | Uint8Array> {
  const session = await getDFSession()

  try {
    const res = await session.get('/v1/Report/GetConsignmentListForPrint', {
      params: {
        consignmentNumbers: consignmentNumbers.join(','),
        numberOfCopies: 1,
      },
      responseType: 'arraybuffer',
    })

    return new Uint8Array(res.data)
  } catch (error) {
    if (error instanceof AxiosError) {
      await sendTeamsMessage(
        'createConsignment DF request failed',
        `**consignmentNumbers**: ${consignmentNumbers.join(', ')}<BR>
          **Code**: ${error.code}<BR>
          **Error Message**: ${error.message}<BR>
          **Body**: ${JSON.stringify(error.config?.data)}<BR>
          `
      )
    }
  }
}
