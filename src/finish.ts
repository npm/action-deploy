import { context, GitHub } from '@actions/github'
import { DeploymentStatus } from './deployment-status'

export async function finish (
  client: GitHub,
  deploymentId: number,
  status: DeploymentStatus
): Promise<void> {
  // const deployment = await client.repos.getDeployment({
  //   ...context.repo,
  //   deployment_id: deploymentId
  // })

  const statusResult = await client.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deploymentId,
    state: status
  })
  console.log(`created deployment status: ${JSON.stringify(statusResult.data, null, 2)}`)
}
