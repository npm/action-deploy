import { jest } from "@jest/globals";
import { GitHub } from "@actions/github/lib/utils";
import fetchmock from "fetch-mock";
import nock from "nock";

const listDeploymentsReply = [] as any;
const getBranchReply = { commit: { sha: "fake-sha" } } as any;
const postDeploymentReply = { id: 42 } as any;
const postStatusReply = {} as any;

// `@actions/core@3` and `@actions/github@9` are ESM-only, so their named
// exports are immutable and cannot be spied on. Mock the modules (via Jest's
// ESM API) before importing the code under test.
jest.unstable_mockModule("@actions/core", () => ({
  getInput: jest.fn(),
  getState: jest.fn((name: string) => process.env[`STATE_${name}`] ?? ""),
  setOutput: jest.fn(),
  saveState: jest.fn(),
  setFailed: jest.fn(),
  error: jest.fn(),
  warning: jest.fn(),
  info: jest.fn(),
  debug: jest.fn(),
}));

// Mutable stand-in for the read-only `github.context`. `repo` is derived from
// GITHUB_REPOSITORY like the real Context; actor/ref/sha are (re)defined per test.
const context: any = { payload: {}, actor: undefined, ref: undefined, sha: undefined };
Object.defineProperty(context, "repo", {
  configurable: true,
  enumerable: true,
  get() {
    const [owner, repo] = String(process.env.GITHUB_REPOSITORY ?? "").split("/");
    return { owner, repo };
  },
});

jest.unstable_mockModule("@actions/github", () => ({
  context,
  getOctokit: jest.fn(),
}));

const core = await import("@actions/core");
const github = await import("@actions/github");
const main = await import("../src/main.js");
const post = await import("../src/post.js");

// mocking console.log to make test output less noisy
jest.spyOn(console, "log").mockImplementation(() => {});

function mockInputs(inputs: any): void {
  jest.mocked(core.getInput).mockImplementation((name: string) => inputs[name]);
}

function mockOctokit(mock: any): void {
  jest.mocked(github.getOctokit).mockImplementation(
    ((token: string, opts: any) =>
      new GitHub({ ...opts, auth: token, request: { fetch: mock } })) as any
  );
}

describe("create", () => {
  beforeEach(() => {
    process.env["GITHUB_REPOSITORY"] = "owner/repo";
    Object.defineProperty(github.context, "actor", { get: () => "fake-actor" });
    Object.defineProperty(github.context, "ref", { get: () => "refs/heads/master" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("200", async () => {
    mockInputs({ token: "fake-token", type: "create" });

    let mock = fetchmock
      .sandbox()
      .get(
        "https://api.github.com/repos/owner/repo/deployments?ref=refs%2Fheads%2Fmaster&environment=master",
        { status: 200, body: listDeploymentsReply }
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

    mockOctokit(mock);

    await main.run();

    mock.done();
  });

  it("400 when environment_url has no https:// prefix", async () => {
    mockInputs({ token: "fake-token", type: "create", environment_url: "test.app" });

    let mock = fetchmock
      .sandbox()
      .get(
        "https://api.github.com/repos/owner/repo/deployments?ref=refs%2Fheads%2Fmaster&environment=master",
        { status: 200, body: listDeploymentsReply }
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

    mockOctokit(mock);

    await expect(main.run()).rejects.toThrow(
      "environment_url must use http(s) scheme"
    );
  });
});

describe("complete", () => {
  beforeEach(() => {
    process.env["GITHUB_REPOSITORY"] = "owner/repo";
    process.env["STATE_deployment_id"] = "42";
    mockInputs({
      token: "fake-token",
      type: "create",
      slack_token: "fake-slack-token",
      slack_channel: "fake-slack-channel",
    });
Object.defineProperty(github.context, "actor", { configurable: true, get: () => "Fake-Actor" });
Object.defineProperty(github.context, "ref", { configurable: true, get: () => "refs/heads/master" });
Object.defineProperty(github.context, "sha", { configurable: true, get: () => "fake-sha-123" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("200", async () => {
    let mock = fetchmock
      .sandbox()
      .get("https://api.github.com/repos/owner/repo/deployments/42/statuses", {
        status: 200,
        body: [
          { id: 10, environment_url: "https://env.url", log_url: "http://logs.url" },
        ],
      })
      .post("https://api.github.com/repos/owner/repo/deployments/42/statuses", {
        status: 201,
        body: postStatusReply,
      });

    mockOctokit(mock);

    const slack = nock("https://slack.com")
      .post("/api/chat.postMessage", (body: any) => body.text.includes("<@fake-actor>"))
      .reply(200, { ok: true });

    await post.post();

    mock.done();
    slack.done();
  });
});

describe("delete-all", () => {
  beforeEach(() => {
    process.env["GITHUB_REPOSITORY"] = "owner/repo";
    mockInputs({ token: "fake-token", type: "delete-all", environment: "staging" });
    Object.defineProperty(github.context, "actor", { get: () => "fake-actor" });
    Object.defineProperty(github.context, "ref", { get: () => "refs/heads/master" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("200", async () => {
    let mock = fetchmock
      .sandbox()
      .get("https://api.github.com/repos/owner/repo/deployments?environment=staging", {
        status: 200,
        body: [
          { id: 42, url: "https://api.github.com/repos/owner/repo/deployments/42" },
        ],
      })
      .post("https://api.github.com/repos/owner/repo/deployments/42/statuses", {
        status: 200,
        body: postStatusReply,
      })
      .delete("https://api.github.com/repos/owner/repo/deployments/42", { status: 200 });

    mockOctokit(mock);

    await main.run();

    mock.done();
  });
});

describe("delete", () => {
  beforeEach(() => {
    process.env["GITHUB_REPOSITORY"] = "owner/repo";
    mockInputs({ token: "fake-token", type: "delete", deployment_id: "42" });
    Object.defineProperty(github.context, "actor", { get: () => "fake-actor" });
    Object.defineProperty(github.context, "ref", { get: () => "refs/heads/master" });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("200", async () => {
    let mock = fetchmock
      .sandbox()
      .post("https://api.github.com/repos/owner/repo/deployments/42/statuses", {
        status: 200,
        body: {
          deployment_url: "https://api.github.com/repos/owner/repo/deployments/42",
        },
      })
      .delete("https://api.github.com/repos/owner/repo/deployments/42", { status: 200 });

    mockOctokit(mock);

    await main.run();

    mock.done();
  });
});
