import * as core from '@actions/core'
import { ChatPostMessageArguments, WebClient } from '@slack/web-api'
import { Context } from '@actions/github/lib/context'

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
  status: string,
  context: Context): Promise<void> {
  if (slackToken === '' || slackChannel === '') {
    return
  }
  const { actor, repo, sha, payload } = context

  try {
    const afterSha = sha.slice(0, 7)
    const repoUrl = `https://github.com/${repo.owner}/${repo.repo}`
    const deploymentUrl = `${repoUrl}/deployments?environment=${environment}#activity-log`
    const commitUrl = `${repoUrl}/commit/${sha}`
    let commitText = `commit <${commitUrl}|${afterSha}>`
    if (payload !== null && typeof payload.compare === 'string') {
      const beforeSha = (payload.before as string ?? '').slice(0, 7)
      const afterShaMessage = (payload.head_commit as {[key: string]: any} ?? {}).message as string
      commitText = `diff <${beforeSha} ⇢ 🚀${afterSha}🚀|${payload.compare}> \`${afterShaMessage}\``
    }

    // message formatting reference - https://api.slack.com/reference/surfaces/formatting
    const text = `<${repoUrl}|${repo.repo}> deployment completed to environment <${deploymentUrl}|${environment}> with status \`${status}\` and ${commitText} by @${actor}`
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
