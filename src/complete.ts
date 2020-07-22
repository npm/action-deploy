import { context, GitHub } from '@actions/github'
import { DeploymentStatus } from './utils'

export async function complete (
  client: GitHub,
  deploymentId: number,
  status: DeploymentStatus
): Promise<void> {
  const statuses = await client.repos.listDeploymentStatuses({
    ...context.repo,
    deployment_id: deploymentId
  })

  const lastStatus = statuses.data.sort((a, b) => a.id - b.id).slice(-1)[0]
  console.log(
    `last status for deployment_id '${deploymentId}': ${JSON.stringify(
      lastStatus,
      null,
      2
    )}`
  )

  const statusResult = await client.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deploymentId,
    state: status,
    environment_url: lastStatus.environment_url,
    log_url: lastStatus.log_url
  })
  console.log(`created deployment status: ${JSON.stringify(statusResult.data, null, 2)}`)
}
