import * as core from '@actions/core'
import { ChatPostMessageArguments, WebClient } from '@slack/web-api'
import { Context } from '@actions/github/lib/context'
import { WebhookPayload } from '@actions/github/lib/interfaces'

export interface WebhookPayloadForPushes extends WebhookPayload {
  after: string
  before: string
  compare?: string
  head_commit: {
    message?: string
  }
}

export type DeploymentStatus =
  | 'error'
  | 'failure'
  | 'inactive'
  | 'in_progress'
  | 'queued'
  | 'pending'
  | 'success'

export type ActionType = 'create' | 'delete' | 'delete-all'

export const DEPLOYMENT_ID_STATE_NAME = 'deployment_id'

// nullify getInput empty results
// to allow coalescence ?? operator
export function getInput (name: string, options?: core.InputOptions): string | null {
  const result = core.getInput(name, options)
  if (result === '') {
    return null
  }
  return result
}

export function getEnvironment (ref: string): string {
  // default to branch name w/o `deploy-` prefix
  const environment = getInput('environment') ?? ref.replace('refs/heads/', '').replace(/^deploy-/, '')
  console.log(`environment: ${environment}`)
  return environment
}

export async function postSlackNotification (
  slackToken: string,
  slackChannel: string,
  environment: string,
  status: DeploymentStatus,
  context: Context): Promise<void> {
  if (slackToken === '' || slackChannel === '') {
    return
  }
  const { actor, repo, sha, payload } = context

  try {
    const statusIcon = status === 'success' ? '✅' : '❌'
    const afterSha = sha.slice(0, 7)
    const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`
    const deploymentUrl = `${repoUrl}/deployments?environment=${environment}#activity-log`
    const commitUrl = `${repoUrl}/commit/${sha}`
    let commitText = `<${commitUrl}|${afterSha}>`
    const payloadForPushes = payload as WebhookPayloadForPushes
    if (payloadForPushes?.compare !== undefined) {
      const beforeSha = payloadForPushes.before.slice(0, 7)
      const afterShaMessage = payloadForPushes.head_commit.message ?? ''
      const shortShaMessage = trimEllipsis(afterShaMessage.replace(/(\r\n|\n|\r).*$/gm, ''), 60) // keep only some first symbols of the first line
      commitText = `<${payloadForPushes.compare}|${beforeSha} ⇢ ${afterSha} ${shortShaMessage}>`
    }

    // message formatting reference - https://api.slack.com/reference/surfaces/formatting
    const text = `<${repoUrl}|${repo.repo}> deployment 🚀 to <${deploymentUrl}|${environment}> by <@${actor}> completed with ${status} ${statusIcon} - ${commitText}`
    const slackClient = new WebClient(slackToken)
    const slackParams: ChatPostMessageArguments = {
      channel: slackChannel,
      unfurl_links: false,
      mrkdwn: true,
      text
    }
    console.log(`Posting Slack message: ${text}`)
    // API description - https://api.slack.com/methods/chat.postMessage
    await slackClient.chat.postMessage(slackParams)
    console.log(`Slack message posted to channel: ${slackChannel}`)
  } catch (error) {
    core.error(error)
  }
}

function trimEllipsis (str: string, length: number): string {
  return str.length > length ? `${str.substring(0, length)}...` : str
}
