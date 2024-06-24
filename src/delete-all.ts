import { context } from '@actions/github'

export async function deleteAll (
  octokitClient: any,
  environment: string
): Promise<void> {
  const deployments = await octokitClient.rest.repos.listDeployments({
    ...context.repo,
    environment
  })

  await Promise.all(deployments.data.map(async (deployment: { id: number, url: string }) => {
    // invalidate deployment first
    // since we can't delete active deployment
    console.log(`invalidate deployment: ${deployment.id}`)
    await octokitClient.rest.repos.createDeploymentStatus({
      ...context.repo,
      deployment_id: deployment.id,
      state: 'failure'
    })

    // then delete it
    console.log(`delete deployment: ${deployment.url}`)
    await octokitClient.request(deployment.url, { method: 'DELETE' })
  }))
}
