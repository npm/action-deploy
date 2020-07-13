import * as core from '@actions/core'
import * as github from '@actions/github'
import { create } from './create'
import { DeploymentStatus } from './deployment-status'

type ActionType = 'create' | 'delete' | 'delete-all' | 'status'

async function run (): Promise<void> {
  let token: string
  let type: ActionType
  let logsUrl: string
  let description: string
  let initialStatus: DeploymentStatus
  let environment: string
  let environmentUrl: string
  let deploymentId: string

  const { actor, ref } = github.context

  console.log('Context..')
  console.log(`actor: ${actor}`)
  console.log(`ref: ${ref}`)

  try {
    console.log('Inputs..')
    token = core.getInput('token', { required: true })

    type = core.getInput('type', { required: true }) as ActionType
    console.log(`type: ${type}`)

    logsUrl = core.getInput('logs') ?? ''
    console.log(`logs: ${logsUrl}`)

    description = core.getInput('description') ?? `deployed by ${actor}`
    console.log(`description: ${description}`)

    initialStatus = (core.getInput('initial_status') ?? 'in_progress') as DeploymentStatus
    console.log(`initialStatus: ${initialStatus}`)

    // default to branch name w/o `deploy-` prefix
    environment = core.getInput('environment') ?? (ref).replace(/^refs\/heads/, '').replace(/^deploy-/, '')
    console.log(`environment: ${environment}`)

    environmentUrl = core.getInput('environment_url') ?? ''
    console.log(`environmentUrl: ${environmentUrl}`)

    const shouldRequireDeploymentId = type === 'status' || type === 'delete'
    deploymentId = core.getInput('deployment_id', { required: shouldRequireDeploymentId })
  } catch (error) {
    core.error(error)
    core.setFailed(`Wrong parameters given: ${JSON.stringify(error, null, 2)}`)
    throw error
  }

  const client = new github.GitHub(token, { previews: ['ant-man', 'flash'] })

  switch (type) {
    case 'create':
      deploymentId = await create(
        client,
        logsUrl,
        description,
        initialStatus,
        environment,
        environmentUrl
      )
      core.setOutput('deployment_id', deploymentId)
      break
    case 'delete':
      break
    case 'delete-all':
      break
    case 'status':
      break
  }
}

run() // eslint-disable-line @typescript-eslint/no-floating-promises
