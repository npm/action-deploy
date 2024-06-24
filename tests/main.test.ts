import * as core from "@actions/core";
import * as github from "@actions/github";
import { GitHub } from "@actions/github/lib/utils";
import * as main from "../src/main";
import * as post from "../src/post";
import fetchmock from "fetch-mock";

import nock from "nock";

const listDeploymentsReply = [] as any;
const getBranchReply = { commit: { sha: "fake-sha" } } as any;
const postDeploymentReply = { id: 42 } as any;
const postStatusReply = {} as any;

// mocking console.log to make test output less noisy
jest.spyOn(console, "log").mockImplementation();

describe("create", () => {
  beforeEach(() => {
    process.env["GITHUB_REPOSITORY"] = "owner/repo";

    // @actions/github
    Object.defineProperty(github.context, "actor", { get: () => "fake-actor" });
    Object.defineProperty(github.context, "ref", {
      get: () => "refs/heads/master",
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it("200", async () => {
    // arrange
    const inputs = {
      token: "fake-token",
      type: "create",
    } as any;
    const inputSpy = jest.spyOn(core, "getInput");
    inputSpy.mockImplementation((name) => inputs[name]);

    let mock = fetchmock
      .sandbox()
      .get(
        "https://api.github.com/repos/owner/repo/deployments?ref=refs%2Fheads%2Fmaster&environment=master",
        {
          status: 200,
          body: listDeploymentsReply,
        }
      )
      .get("https://api.github.com/repos/owner/repo/branches/master", {
        status: 200,
        body: getBranchReply,
      })
      .post("https://api.github.com/repos/owner/repo/deployments", {
        status: 201,
        body: postDeploymentReply,
      })
      .post("https://api.github.com/repos/owner/repo/deployments/42/statuses", {
        status: 201,
        body: postStatusReply,
      });

    const getOctokitSpy = jest.spyOn(github, "getOctokit");
    getOctokitSpy.mockImplementation(
      (token, opts) =>
        new GitHub({ ...opts, auth: token, request: { fetch: mock } })
    );

    // act
    await main.run();

    // assert
    mock.done();
  });

  it("400 when environment_url has no https:// prefix", async () => {
    // arrange
    const inputs = {
      token: "fake-token",
      type: "create",
      environment_url: "test.app",
    } as any;
    const inputSpy = jest.spyOn(core, "getInput");
    inputSpy.mockImplementation((name) => inputs[name]);

    const setFailedSpy = jest.spyOn(core, "setFailed");

    let mock = fetchmock
      .sandbox()
      .get(
        "https://api.github.com/repos/owner/repo/deployments?ref=refs%2Fheads%2Fmaster&environment=master",
        {
          status: 200,
          body: listDeploymentsReply,
        }
      )
      .get("https://api.github.com/repos/owner/repo/branches/master", {
        status: 200,
        body: getBranchReply,
      })
      .post("https://api.github.com/repos/owner/repo/deployments", {
        status: 400,
        body: {
          resource: "DeploymentStatus",
          code: "custom",
          field: "environment_url",
          message: "environment_url must use http(s) scheme",
        },
      });

    const getOctokitSpy = jest.spyOn(github, "getOctokit");
    getOctokitSpy.mockImplementation(
      (token, opts) =>
        new GitHub({ ...opts, auth: token, request: { fetch: mock } })
    );

    // act
    expect(main.run()).rejects.toThrow("environment_url must use http(s) scheme");
  });
});

describe("complete", () => {
  beforeEach(() => {
    process.env["STATE_deployment_id"] = "42";

    let inputs = {} as any;
    let inputSpy: jest.SpyInstance;

    // @actions/core
    inputs = {
      token: "fake-token",
      type: "create",
      slack_token: "fake-slack-token",
      slack_channel: "fake-slack-channel",
    };
    inputSpy = jest.spyOn(core, "getInput");
    inputSpy.mockImplementation((name) => inputs[name]);

    // @actions/github
    Object.defineProperty(github.context, "actor", { get: () => "Fake-Actor" });
    Object.defineProperty(github.context, "ref", {
      get: () => "refs/heads/master",
    });
    Object.defineProperty(github.context, "sha", { get: () => "fake-sha-123" });
    Object.defineProperty(github.context, "repo", {
      get: () => {
        return { owner: "owner", repo: "repo" };
      },
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it("200", async () => {
    // arrange
    let mock = fetchmock.sandbox()
      .get('https://api.github.com/repos/owner/repo/deployments/42/statuses', {
        status: 200,
        body: [
          {
            id: 10,
            environment_url: "https://env.url",
            log_url: "http://logs.url",
          },
        ],
      })
      .post('https://api.github.com/repos/owner/repo/deployments/42/statuses', {
        status: 201,
        body: postStatusReply,
      })

    const getOctokitSpy = jest.spyOn(github, "getOctokit");
    getOctokitSpy.mockImplementation(
      (token, opts) =>
        new GitHub({ ...opts, auth: token, request: { fetch: mock } })
    );

    const slack = nock("https://slack.com")
      .post("/api/chat.postMessage", (body) =>
        body.text.includes("<@fake-actor>")
      )
      .reply(200, { ok: true });
    // act
    await post.post();

    // assert
    mock.done();
    slack.done();
  });
});

describe("delete-all", () => {
  beforeEach(() => {
    process.env["GITHUB_REPOSITORY"] = "owner/repo";

    let inputs = {} as any;
    let inputSpy: jest.SpyInstance;

    // @actions/core
    inputs = {
      token: "fake-token",
      type: "delete-all",
      environment: "staging",
    };
    inputSpy = jest.spyOn(core, "getInput");
    inputSpy.mockImplementation((name) => inputs[name]);

    // @actions/github
    Object.defineProperty(github.context, "actor", { get: () => "fake-actor" });
    Object.defineProperty(github.context, "ref", {
      get: () => "refs/heads/master",
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it("200", async () => {
    let mock = fetchmock.sandbox()
      .get("https://api.github.com/repos/owner/repo/deployments?environment=staging", {
        status: 200,
        body: [
          {
            id: 42,
            url: "https://api.github.com/repos/owner/repo/deployments/42",
          },
        ],
      })
      .post("https://api.github.com/repos/owner/repo/deployments/42/statuses", {
        status: 200,
        body: postStatusReply,
      })
      .delete("https://api.github.com/repos/owner/repo/deployments/42", {
        status: 200,
      });
  
    // arrange
    const getOctokitSpy = jest.spyOn(github, "getOctokit");
    getOctokitSpy.mockImplementation(
      (token, opts) =>
        new GitHub({ ...opts, auth: token, request: { fetch: mock } })
    );

    // act
    await main.run();

    // assert
    mock.done();
  });
});

describe("delete", () => {
  beforeEach(() => {
    process.env["GITHUB_REPOSITORY"] = "owner/repo";

    let inputs = {} as any;
    let inputSpy: jest.SpyInstance;

    // @actions/core
    inputs = {
      token: "fake-token",
      type: "delete",
      deployment_id: "42",
    };
    inputSpy = jest.spyOn(core, "getInput");
    inputSpy.mockImplementation((name) => inputs[name]);

    // @actions/github
    Object.defineProperty(github.context, "actor", { get: () => "fake-actor" });
    Object.defineProperty(github.context, "ref", {
      get: () => "refs/heads/master",
    });
  });

  afterEach(() => {
    jest.resetAllMocks();
    jest.clearAllMocks();
  });

  it("200", async () => {
    // arrange
    let mock = fetchmock.sandbox()
    .post("https://api.github.com/repos/owner/repo/deployments/42/statuses", {
      status: 200,
      body: { 
      deployment_url:
        "https://api.github.com/repos/owner/repo/deployments/42",
    },
    })
    .delete("https://api.github.com/repos/owner/repo/deployments/42", {
      status: 200,
    });
    

    const getOctokitSpy = jest.spyOn(github, "getOctokit");
    getOctokitSpy.mockImplementation(
      (token, opts) =>
        new GitHub({ ...opts, auth: token, request: { fetch: mock } })
    );

    // act
    await main.run();

    // assert
    mock.done();  
  });
});
