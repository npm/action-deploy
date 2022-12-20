import { context, getOctokit } from '@actions/github'

export async function deleteDeployment (
  client: ReturnType<typeof getOctokit>,
  deploymentId: number
): Promise<void> {
  // invalidate deployment first
  // since we can't delete active deployment
  console.log(`invalidate deployment: ${deploymentId}`)
  const status = await client.rest.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deploymentId,
    state: 'failure'
  })

  // then delete it
  const deploymentUrl = status.data.deployment_url
  console.log(`delete deployment: ${deploymentUrl}`)
  await client.request(deploymentUrl, { method: 'DELETE' })
}
