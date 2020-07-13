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

  try {
    token = core.getInput('token', { required: true })
    type = core.getInput('type', { required: true }) as ActionType
    logsUrl = core.getInput('logs') ?? ''
    description = core.getInput('description') ?? `deployed by ${actor}`
    initialStatus =
      (core.getInput('initial_status') as DeploymentStatus) ?? 'in_progress'

    // default to branch name w/o `deploy-` prefix
    environment = core.getInput('environment') ?? (ref ?? '').replace(/^refs\/heads/, '').replace(/^deploy-/, '')
    environmentUrl = core.getInput('environment_url')

    const shouldRequireDeploymentId = type === 'status' || type === 'delete'
    deploymentId = core.getInput('deployment_id', {
      required: shouldRequireDeploymentId
    })
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
