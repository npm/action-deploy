import { context } from '@actions/github'
import { DeploymentStatus } from './utils'

export async function complete (
  octokitClient: any,
  deploymentId: number,
  status: DeploymentStatus
): Promise<void> {
  const statuses = await octokitClient.rest.repos.listDeploymentStatuses({
    ...context.repo,
    deployment_id: deploymentId
  })

  const lastStatus = statuses.data.sort((a: { id: number }, b: { id: number }) => a.id - b.id).slice(-1)[0]
  console.log(
    `last status for deployment_id '${deploymentId}': ${JSON.stringify(
      lastStatus,
      null,
      2
    )}`
  )

  const statusResult = await octokitClient.rest.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deploymentId,
    state: status,
    environment_url: lastStatus.environment_url,
    log_url: lastStatus.log_url
  })
  console.log(`created deployment status: ${JSON.stringify(statusResult.data, null, 2)}`)
}
