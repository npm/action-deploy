import { context, GitHub } from '@actions/github'
import { DeploymentStatus } from './deployment-status'

export async function finish (
  client: GitHub,
  deploymentId: number,
  status: DeploymentStatus,
  logUrl: string,
  environmentUrl: string
): Promise<void> {
  const statusResult = await client.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deploymentId,
    state: status,
    log_url: logUrl,
    environment_url: environmentUrl
  })
  console.log(`created deployment status: ${JSON.stringify(statusResult.data, null, 2)}`)
}
