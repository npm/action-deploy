import { context, GitHub } from '@actions/github'
import * as core from '@actions/core'
import { DeploymentStatus } from './deployment-status'

async function invalidatePreviousDeployments (
  client: GitHub,
  environment: string
): Promise<void> {
  const deployments = await client.repos.listDeployments({
    ...context.repo,
    ref: context.ref,
    environment
  })

  await Promise.all(
    deployments.data.map(async deployment => {
      const statuses = await client.repos.listDeploymentStatuses({
        ...context.repo,
        deployment_id: deployment.id
      })

      const lastStatus = statuses.data.sort((a, b) => a.id - b.id).slice(-1)[0]
      console.log(
        `last status for deployment_id '${deployment.id}': ${JSON.stringify(
          lastStatus,
          null,
          2
        )}`
      )

      // invalidate the deployment
      if (lastStatus.state === 'success') {
        console.log(
          `invalidating deployment: ${JSON.stringify(deployment, null, 2)}`
        )
        await client.repos.createDeploymentStatus({
          ...context.repo,
          deployment_id: deployment.id,
          state: 'inactive'
        })
      }
    })
  )
}

export async function create (
  client: GitHub,
  logUrl: string,
  description: string,
  initialStatus: DeploymentStatus,
  environment: string,
  environmentUrl: string
): Promise<string> {
  await invalidatePreviousDeployments(client, environment)

  const deployment = await client.repos.createDeployment({
    ...context.repo,
    ref: context.ref,
    required_contexts: [],
    environment,
    transient_environment: true,
    auto_merge: false,
    description
  })

  await client.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deployment.data.id,
    state: initialStatus,
    log_url: logUrl,
    environment_url: environmentUrl
  })
  core.setOutput('deployment_id', deployment.data.id.toString())

  return deployment.data.id.toString()
}
