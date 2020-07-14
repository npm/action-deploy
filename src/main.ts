import * as core from '@actions/core'
import * as github from '@actions/github'
import { create } from './create'
import { finish } from './finish'
import { deleteAll } from './delete-all'
import { DeploymentStatus } from './deployment-status'

type ActionType = 'create' | 'delete' | 'delete-all' | 'finish'

// nullify getInput empty results
// to allow coalescence ?? operator
function getInput (name: string, options?: core.InputOptions): string | null {
  const result = core.getInput(name, options)
  if (result === '') {
    return null
  }
  return result
}

export async function run (): Promise<void> {
  let token: string
  let type: ActionType
  let logsUrl: string
  let description: string
  let status: DeploymentStatus
  let environment: string
  let environmentUrl: string
  let deploymentId: string

  const { actor, ref } = github.context

  console.log('Context..')
  console.log(`actor: ${actor}`)
  console.log(`ref: ${ref}`)

  try {
    console.log('Inputs..')
    token = getInput('token', { required: true }) ?? ''

    type = getInput('type', { required: true }) as ActionType
    console.log(`type: ${type}`)

    logsUrl = getInput('logs') ?? ''
    console.log(`logs: ${logsUrl}`)

    description = getInput('description') ?? `deployed by ${actor}`
    console.log(`description: ${description}`)

    status = (getInput('status') ?? 'in_progress') as DeploymentStatus
    console.log(`status: ${status}`)

    // default to branch name w/o `deploy-` prefix
    environment = getInput('environment') ?? ref.replace('refs/heads/', '').replace(/^deploy-/, '')
    console.log(`environment: ${environment}`)

    environmentUrl = getInput('environment_url') ?? ''
    console.log(`environmentUrl: ${environmentUrl}`)

    const shouldRequireDeploymentId = type === 'finish' || type === 'delete'
    deploymentId = getInput('deployment_id', { required: shouldRequireDeploymentId }) ?? '0'
    console.log(`deploymentId: ${deploymentId}`)
  } catch (error) {
    core.error(error)
    core.setFailed(`Wrong parameters given: ${JSON.stringify(error, null, 2)}`)
    throw error
  }

  const client = new github.GitHub(token, { previews: ['ant-man', 'flash'] })

  switch (type) {
    case 'create':
      try {
        deploymentId = await create(
          client,
          logsUrl,
          description,
          status,
          environment,
          environmentUrl
        )
        core.setOutput('deployment_id', deploymentId)
      } catch (error) {
        core.error(error)
        throw error
      }
      break
    case 'finish':
      try {
        await finish(
          client,
          Number(deploymentId),
          status,
          logsUrl,
          environmentUrl
        )
      } catch (error) {
        core.error(error)
        throw error
      }
      break
    case 'delete':
      break
    case 'delete-all':
      try {
        await deleteAll(
          client,
          environment
        )
      } catch (error) {
        core.error(error)
        throw error
      }
      break
  }
}

if (process.env.NODE_ENV !== 'test') run() // eslint-disable-line @typescript-eslint/no-floating-promises
