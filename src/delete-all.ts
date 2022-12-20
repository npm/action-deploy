import { context, getOctokit } from '@actions/github'

export async function deleteAll (
  client: ReturnType<typeof getOctokit>,
  environment: string
): Promise<void> {
  const deployments = await client.rest.repos.listDeployments({
    ...context.repo,
    environment
  })

  await Promise.all(deployments.data.map(async (deployment) => {
    // invalidate deployment first
    // since we can't delete active deployment
    console.log(`invalidate deployment: ${deployment.id}`)
    await client.rest.repos.createDeploymentStatus({
      ...context.repo,
      deployment_id: deployment.id,
      state: 'failure'
    })

    // then delete it
    console.log(`delete deployment: ${deployment.url}`)
    await client.request(deployment.url, { method: 'DELETE' })
  }))
}
