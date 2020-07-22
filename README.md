# Action to manage GitHub deployments

Features:
- create a deployment (and invalidate all previous deployments)
- delete all deployments in specific environment
- delete a deployment by id

## Usage

### create

Inputs:

| parameter | description
| - | -
`token`|**Required** token to authorize calls to GitHub API, can be ${{github.token}} to create a deployment for the same repo
`type`|**Required** type of an action. Should be `create` to create a deployment
`logs`|url to the deployment logs
`environment`|environment to create a deployments in, default to `$context.ref` without prefixes (`'refs/heads/'`, `'deploy-'`), i.e. branch name
`environment_url`|link to the deployed application
`description`|optional description, defaults to `"deployed by $context.actor"`
`job_status`|pass `${{job.status}}` to set the deployment completion status post script accordingly

Outputs:

|output | description
|- | -
`deployment_id` | The `id` of the created deployment

#### Example usage

```yaml
- name: create a deployment
  uses: npm/action-deploy@v2
  with:
    type: create
    token: ${{github.token}}
    logs: https://your-app.com/deployment_logs
    environment: staging
    environment_url: https://staging.your-app.com
    job_status: ${{job.status}} # use this to track success of the deployment in post script
```

### delete-all

Allows deleting all deployments for a specific environment

Inputs:

|parameter | description
|- | -
`token` | **Required** token to authorize calls to GitHub API, can be ${{github.token}} to create a deployment for the same repo
`type` | **Required** type of an action. Should be `delete-all`
`environment` | environment to delete all deployments in

Outputs: none

#### Example usage

```yaml
- name: delete all deployments in staging
  uses: npm/action-deploy@v2
  with:
    type: delete-all
    token: ${{github.token}}
    environment: staging
```

### delete

Given in one of the previous steps you created a deployment, with `delete` you can delete it by id

Inputs:

|parameter | description
|- | -
`token` | **Required** token to authorize calls to GitHub API, can be ${{github.token}} to create a deployment for the same repo
`type` | **Required** type of an action. Should be `delete`
`deployment_id` | **Required** the `id` of the a deployment to delete

Outputs: none

#### Example usage

```yaml
- name: create a deployment
  uses: npm/action-deploy@v2
  id: create-deployment
  with:
    type: create
    token: ${{github.token}}
    logs: https://your-app.com/deployment_logs
    environment: staging
    environment_url: https://staging.your-app.com
    job_status: ${{job.status}}

# add your deployment steps here
- name: placeholder for actual deployment
  run: sleep 10s

- name: delete deployment
  uses: npm/action-deploy@v2
  with:
    type: delete
    token: ${{github.token}}
    deployment_id: ${{steps.create-deployment.outputs.deployment_id}}
```

## Development

### Prerequisites

Install the dependencies
```bash
$ npm install
```

Build the typescript and package it for distribution
```bash
$ npm run build && npm run pack
```

Run the tests :heavy_check_mark:
```bash
$ npm run build && npm test
```

### Update action.yml

The action.yml contains defines the inputs and output for your action.

Update the action.yml with description, inputs and outputs for your action.

See the [documentation](https://help.github.com/en/articles/metadata-syntax-for-github-actions)

### Change the Code

Most toolkit and CI/CD operations involve async operations so the action is run in an async function.

```javascript
import * as core from '@actions/core';
...

async function run() {
  try {
      ...
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
```

See the [toolkit documentation](https://github.com/actions/toolkit/blob/master/README.md#packages) for the various packages.

## Publish to a distribution branch

Actions are run from GitHub repos so we will checkin the packed dist folder.

Then run [ncc](https://github.com/zeit/ncc) and push the results:
```bash
$ npm run pack
$ git add dist
$ git commit -a -m "prod dependencies"
$ git push origin releases/v1
```

Your action is now published! :rocket:

See the [versioning documentation](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md)

## Validate

You can now validate the action by referencing `./` in a workflow in your repo (see [test.yml](.github/workflows/test.yml)])

```yaml
- uses: ./
  name: Delete all deployments
  with:
    token: ${{github.token}}
    type: delete-all
```

See the [actions tab](https://github.com/npm/action-deploy/actions) for runs of this action! :rocket:

## Deploy

After testing you can [create a v1 tag](https://github.com/actions/toolkit/blob/master/docs/action-versioning.md) to reference the stable and latest V1 action
