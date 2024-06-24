import { context } from '@actions/github'

export async function deleteDeployment (
  octoKitClient: any,
  deploymentId: number
): Promise<void> {
  // invalidate deployment first
  // since we can't delete active deployment
  console.log(`invalidate deployment: ${deploymentId}`)
  const status = await octoKitClient.rest.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deploymentId,
    state: 'failure'
  })

  // then delete it
  const deploymentUrl = String(status.data.deployment_url)
  console.log(`delete deployment: ${deploymentUrl}`)
  await octoKitClient.request(deploymentUrl, { method: 'DELETE' })
}
