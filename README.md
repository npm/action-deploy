# Action to send npm service deployment notifications to Slack

## Usage

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
`slack_token`|optional token of slack integration to post messages with deployment results
`slack_channel`|optional slack channel name (both `slack_token` and `slack_channel` are required to post a message)

#### Example usage

```yaml
- name: send deployment complete message to Slack
  uses: npm/action-deployment-notifications@v1
  with:
    environment: staging
    environment_url: https://staging.your-app.com
    job_status: ${{job.status}} # use this to track success of the deployment in post script
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
$ nvm install
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
