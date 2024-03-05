import * as core from '@actions/core'
import * as github from '@actions/github'
import { create } from './create'

import { deleteAll } from './delete-all'
import { deleteDeployment } from './delete'
import { ActionType, DeploymentStatus, getInput, DEPLOYMENT_ID_STATE_NAME, getEnvironment } from './utils'

export async function run (): Promise<void> {
  let token: string
  let type: ActionType
  let logsUrl: string
  let description: string
  let status: DeploymentStatus
  let environment: string
  let environmentUrl: string
  let deploymentId: string
  let mainBranch: string

  const { actor, ref } = github.context

  console.log('### main.context ###')
  console.log(`actor: ${actor}`)
  console.log(`ref: ${ref}`)
  console.log('\n')

  try {
    console.log('### main.inputs ###')
    token = getInput('token', { required: true }) ?? ''

    type = getInput('type', { required: true }) as ActionType
    console.log(`type: ${type}`)

    logsUrl = getInput('logs') ?? ''
    console.log(`logs: ${logsUrl}`)

    description = getInput('description') ?? `deployed by ${actor}`
    console.log(`description: ${description}`)

    status = (getInput('status') ?? 'in_progress') as DeploymentStatus
    console.log(`status: ${status}`)

    environment = getEnvironment(ref)

    environmentUrl = getInput('environment_url') ?? ''
    console.log(`environmentUrl: ${environmentUrl}`)

    mainBranch = getInput('main_branch') ?? 'master'
    console.log(`main branch: ${mainBranch}`)

    const shouldRequireDeploymentId = type === 'delete'
    deploymentId = getInput(DEPLOYMENT_ID_STATE_NAME, { required: shouldRequireDeploymentId }) ?? '0'
    console.log(`deploymentId: ${deploymentId}`)
  } catch (error) {
    core.error(`${error instanceof Error ? error.message : String(error)}`)
    core.setFailed(`Wrong parameters given: ${JSON.stringify(error, null, 2)}`)
    throw error
  }
  console.log('\n')

  const client = new github.GitHub(token, { previews: ['ant-man', 'flash'] })

  console.log('### run ###')

  switch (type) {
    case 'create':
      try {
        // If a deployment was already created on a previous job,
        // don't create one again.
        if (deploymentId === '0') {
          deploymentId = await create(
            client,
            logsUrl,
            description,
            status,
            environment,
            environmentUrl,
            mainBranch
          )
        }
        console.log(`saveState::${DEPLOYMENT_ID_STATE_NAME}: ${deploymentId}`)
        core.saveState(DEPLOYMENT_ID_STATE_NAME, deploymentId) // for internal use
        core.setOutput(DEPLOYMENT_ID_STATE_NAME, deploymentId) // keep that output for external dependencies
      } catch (error) {
        core.error(`${error instanceof Error ? error.message : String(error)}`)
        core.setFailed(`Create deployment failed: ${JSON.stringify(error, null, 2)}`)
        throw error
      }
      break
    case 'delete':
      try {
        await deleteDeployment(
          client,
          Number(deploymentId)
        )
      } catch (error) {
        core.error(`${error instanceof Error ? error.message : String(error)}`)
        core.setFailed(`Delete deployment failed: ${JSON.stringify(error, null, 2)}`)
        throw error
      }
      break
    case 'delete-all':
      try {
        await deleteAll(
          client,
          environment
        )
      } catch (error) {
        core.error(`${error instanceof Error ? error.message : String(error)}`)
        core.setFailed(`Delete all deployments failed: ${JSON.stringify(error, null, 2)}`)
        throw error
      }
      break
  }
}

if (process.env.NODE_ENV !== 'test') run() // eslint-disable-line @typescript-eslint/no-floating-promises
