import { context } from '@actions/github'
import { DeploymentStatus } from './utils'

async function invalidatePreviousDeployments (
  octokitClient: any,
  environment: string
): Promise<void> {
  const deployments = await octokitClient.rest.repos.listDeployments({
    ...context.repo,
    ref: context.ref,
    environment
  })

  await Promise.all(
    deployments.data.map(async (deployment: { id: number }) => {
      const statuses = await octokitClient.rest.repos.listDeploymentStatuses({
        ...context.repo,
        deployment_id: deployment.id
      })

      const lastStatus = statuses.data.sort((a: { id: number }, b: { id: number }) => a.id - b.id).slice(-1)[0]
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
        await octokitClient.rest.repos.createDeploymentStatus({
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

async function getMainSha (octokitClient: any, branch: string): Promise<string> {
  try {
    const response = await octokitClient.rest.repos.getBranch({ ...context.repo, branch })
    const sha = String(response.data.commit.sha)
    console.log(`${branch} branch sha: ${sha}`)
    return sha
  } catch (error: any) {
    console.error(error.message)
    return `no_${branch}`
  }
}

export async function create (
  octokitClient: any,
  logUrl: string,
  description: string,
  initialStatus: DeploymentStatus,
  environment: string,
  environmentUrl: string,
  mainBranch: string
): Promise<string> {
  await invalidatePreviousDeployments(octokitClient, environment)

  // get main branch sha to store in payload
  const mainBranchSha = await getMainSha(octokitClient, mainBranch)

  const payload = JSON.stringify({ actor: context.actor, main_sha: mainBranchSha })

  const deployment = await octokitClient.rest.repos.createDeployment({
    ...context.repo,
    ref: context.ref,
    required_contexts: [],
    environment,
    transient_environment: true,
    auto_merge: false,
    description,
    payload
  })

  const deploymentId = deployment.data.id

  console.log(`created deployment: ${JSON.stringify(deployment.data, null, 2)}`)

  const status = await octokitClient.rest.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deploymentId,
    state: initialStatus,
    log_url: logUrl,
    environment_url: environmentUrl
  })
  console.log(`created deployment status: ${JSON.stringify(status.data, null, 2)}`)
  return deploymentId.toString()
}
