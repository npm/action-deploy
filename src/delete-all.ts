import { context, GitHub } from '@actions/github'

export async function deleteAll (
  client: GitHub,
  environment: string
): Promise<void> {
  const deployments = await client.repos.listDeployments({
    ...context.repo,
    environment
  })

  await Promise.all(deployments.data.map(async (deployment) => {
    // invalidate deployment first
    // since we can't delete active deployment
    console.log(`invalidate deployment: ${deployment.id}`)
    await client.repos.createDeploymentStatus({
      ...context.repo,
      deployment_id: deployment.id,
      state: 'failure'
    });

    // then delete it
    console.log(`delete deployment: ${deployment.url}`)
    await client.request(deployment.url, { "method": "DELETE" })
  }))
}
