import { context, GitHub } from '@actions/github'
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
      if (lastStatus?.state === 'success') {
        console.log(`invalidating deployment: ${JSON.stringify(deployment, null, 2)}`)
        await client.repos.createDeploymentStatus({
          ...context.repo,
          deployment_id: deployment.id,
          state: 'inactive',
          environment_url: lastStatus.environment_url,
          log_url: lastStatus.log_url
        })
      }
    })
  )
}

async function getMainSha (client: GitHub, branch: string): Promise<string> {
  try {
    const response = await client.repos.getBranch({ ...context.repo, branch })
    const sha = response.data.commit.sha
    console.log(`${branch} branch sha: ${sha}`)
    return sha
  } catch (error) {
    console.error(error.message)
    return `no_${branch}`
  }
}

export async function create (
  client: GitHub,
  logUrl: string,
  description: string,
  initialStatus: DeploymentStatus,
  environment: string,
  environmentUrl: string,
  mainBranch: string
): Promise<string> {
  await invalidatePreviousDeployments(client, environment)

  // get main branch sha to store in payload
  const mainBranchSha = await getMainSha(client, mainBranch)

  const payload = JSON.stringify({ actor: context.actor, main_sha: mainBranchSha })

  const deployment = await client.repos.createDeployment({
    ...context.repo,
    ref: context.ref,
    required_contexts: [],
    environment,
    transient_environment: true,
    auto_merge: false,
    description,
    payload
  })

  console.log(`created deployment: ${JSON.stringify(deployment.data, null, 2)}`)

  const status = await client.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deployment.data.id,
    state: initialStatus,
    log_url: logUrl,
    environment_url: environmentUrl
  })
  console.log(`created deployment status: ${JSON.stringify(status.data, null, 2)}`)
  return deployment.data.id.toString()
}
