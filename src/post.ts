import * as core from '@actions/core'
import * as github from '@actions/github'
import { complete } from './complete'
import { ActionType, DeploymentStatus, getInput, DEPLOYMENT_ID_STATE_NAME, getEnvironment, postSlackNotification } from './utils'

export async function post (): Promise<void> {
  let token: string
  let type: ActionType
  let deploymentId: string
  let jobStatus: string
  let environment: string
  let slackToken: string
  let slackChannel: string

  const { actor, ref, repo, sha } = github.context

  console.log('### post.context ###')
  console.log(`actor: ${actor}`)
  console.log(`ref: ${ref}`)
  console.log(`owner: ${repo.owner}`)
  console.log(`repo: ${repo.repo}`)
  console.log(`sha: ${sha}`)
  console.log('\n')

  try {
    console.log('### post.inputs ###')
    token = getInput('token', { required: true }) ?? ''

    type = getInput('type', { required: true }) as ActionType
    console.log(`type: ${type}`)

    jobStatus = getInput('job_status') ?? 'success'
    console.log(`job_status: ${jobStatus}`)

    environment = getEnvironment(ref)

    slackToken = getInput('slack_token') ?? ''
    console.log(`slack_token: ${slackToken === '' ? 'none' : 'passed'}`)

    slackChannel = getInput('slack_channel') ?? ''
    console.log(`slack_channel: ${slackChannel}`)
  } catch (error) {
    core.error(error)
    core.setFailed(`Wrong parameters given: ${JSON.stringify(error, null, 2)}`)
    throw error
  }
  console.log('\n')
  console.log('### post ###')

  const client = new github.GitHub(token, { previews: ['ant-man', 'flash'] })
  const status: DeploymentStatus = jobStatus === 'success' ? 'success' : 'failure'
  console.log(`status: ${status}`)

  switch (type) {
    case 'create':
      deploymentId = core.getState(DEPLOYMENT_ID_STATE_NAME)
      console.log(`deploymentId: ${deploymentId}`)
      if (deploymentId === undefined || deploymentId === '') {
        console.log('No deploymentId provided, skip status update')
        return
      }

      // Post Slack notification
      await postSlackNotification(slackToken, slackChannel, repo, sha, environment, status, actor)

      try {
        await complete(client, Number(deploymentId), status)
      } catch (error) {
        if (error.name === 'HttpError' && error.status === 404) {
          console.log('Couldn\'t complete a deployment: not found')
          return
        }
        core.error(error)
        core.setFailed(`Complete deployment failed: ${JSON.stringify(error, null, 2)}`)
        throw error
      }

      break
    default:
      console.log(`No post script for type: ${type}`)
      break
  }
}

if (process.env.NODE_ENV !== 'test') post() // eslint-disable-line @typescript-eslint/no-floating-promises
