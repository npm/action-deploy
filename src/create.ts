import { context, getOctokit } from '@actions/github'
import { DeploymentStatus } from './utils'

async function invalidatePreviousDeployments (
  client: ReturnType<typeof getOctokit>,
  environment: string
): Promise<void> {
  const deployments = await client.rest.repos.listDeployments({
    ...context.repo,
    ref: context.ref,
    environment
  })

  await Promise.all(
    deployments.data.map(async deployment => {
      const statuses = await client.rest.repos.listDeploymentStatuses({
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
        await client.rest.repos.createDeploymentStatus({
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

async function getMainSha (client: ReturnType<typeof getOctokit>, branch: string): Promise<string> {
  try {
    const response = await client.rest.repos.getBranch({
      ...context.repo,
      branch
    })
    const sha = response.data.commit.sha
    console.log(`${branch} branch sha: ${sha}`)
    return sha
  } catch (error) {
    if (error instanceof Error) {
      console.error(error.message)
    }

    return `no_${branch}`
  }
}

export async function create (
  client: ReturnType<typeof getOctokit>,
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

  const payload = JSON.stringify({
    actor: context.actor,
    main_sha: mainBranchSha
  })

  const deployment = await client.rest.repos.createDeployment({
    ...context.repo,
    ref: context.ref,
    required_contexts: [],
    environment,
    transient_environment: true,
    auto_merge: false,
    description,
    payload
  })

  if (deployment.status !== 201) {
    throw new Error('failed to create deployment')
  }

  console.log(`created deployment: ${JSON.stringify(deployment.data, null, 2)}`)

  const status = await client.rest.repos.createDeploymentStatus({
    ...context.repo,
    deployment_id: deployment.data.id,
    state: initialStatus,
    log_url: logUrl,
    environment_url: environmentUrl
  })

  console.log(`created deployment status: ${JSON.stringify(status.data, null, 2)}`)

  return deployment.data.id.toString()
}
