import asyncio
import hashlib
import hmac
import json
from unittest.mock import MagicMock, patch
import httpx
from app.main import app


def _sign_webhook(secret: str, body: bytes) -> str:
    return "sha256=" + hmac.new(secret.encode("utf-8"), body, hashlib.sha256).hexdigest()


class _FakeResponse:
    def __init__(self, status_code: int, payload, headers=None):
        self.status_code = status_code
        self._payload = payload
        self.headers = headers or {}

    def json(self):
        return self._payload


def _mock_github_client(*args, **kwargs):
    client = MagicMock()

    def fake_get(url, headers=None):
        if url.endswith("/user"):
            return _FakeResponse(200, {
                "login": "devtrack-tester",
                "avatar_url": "https://avatars.githubusercontent.com/u/1?v=4",
                "html_url": "https://github.com/devtrack-tester",
            }, headers={"x-oauth-scopes": "repo, read:user"})
        if url.endswith("/repos/Sugamchaturvedi/DevTrack-Demo"):
            return _FakeResponse(200, {
                "description": "Demo University Repo",
                "default_branch": "main",
                "private": False,
                "language": "Python",
                "stargazers_count": 5,
                "forks_count": 2,
                "open_issues_count": 1,
                "html_url": "https://github.com/Sugamchaturvedi/DevTrack-Demo",
            })
        if "/branches" in url:
            return _FakeResponse(200, [{"name": "main", "commit": {"sha": "11111112222222"}, "protected": True}])
        if "/commits" in url:
            return _FakeResponse(200, [])
        if "/pulls" in url:
            return _FakeResponse(200, [])
        if "/actions/runs" in url:
            return _FakeResponse(200, {"workflow_runs": []})
        return _FakeResponse(404, {})

    client.__enter__.return_value = client
    client.get.side_effect = fake_get
    return client


def test_phase1_github_devops_qa_end_to_end():
    async def run():
        async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
            # 1. Authenticate as Super Admin
            r = await client.post("/auth/login", json={
                "email": "admin@devtrack.edu",
                "password": "DevTrack@123",
            })
            assert r.status_code == 200, r.text
            token = r.json()["access_token"]
            headers = {"Authorization": f"Bearer {token}"}

            # 2. Create isolated test project and issue
            r = await client.post("/projects/", json={
                "name": "Phase 1 DevOps & QA Verification Project",
                "category": "Capstone",
                "priority": "high",
            }, headers=headers)
            assert r.status_code == 201, r.text
            proj_id = r.json()["id"]

            try:
                r = await client.post(f"/pm/projects/{proj_id}/issues", json={
                    "title": "Implement OAuth2 Webhook Signature Verification",
                    "description": "Verify HMAC SHA-256 on incoming webhooks",
                    "issue_type": "story",
                    "priority": "high",
                    "story_points": 5,
                }, headers=headers)
                assert r.status_code == 201, r.text
                issue = r.json()
                issue_id = issue["id"]
                issue_key = issue["issue_key"]

                # ------------------------------------------------------------------
                # A. GITHUB INTEGRATION (with controlled GitHub API mock)
                # ------------------------------------------------------------------
                with patch("app.services.github_service.httpx.Client", side_effect=_mock_github_client):
                    # Connect GitHub account (PAT encrypted at rest, never returned)
                    r = await client.post("/github/connect", json={
                        "access_token": "ghp_test_token_secret_12345678",
                        "github_username": "devtrack-tester",
                    }, headers=headers)
                    assert r.status_code == 201, r.text
                    conn = r.json()
                    assert conn["github_username"] == "devtrack-tester"
                    assert conn["is_verified"] is True
                    assert "encrypted_token" not in conn
                    assert "ghp_test_token_secret_12345678" not in json.dumps(conn)
                    assert conn["token_hint"] == "****5678"

                    # Link Repository with webhook secret
                    webhook_secret = "super-secret-hmac-key"
                    r = await client.post(f"/github/projects/{proj_id}/repos", json={
                        "repo_url_or_slug": "Sugamchaturvedi/DevTrack-Demo",
                        "default_branch": "main",
                        "webhook_secret": webhook_secret,
                        "use_my_connection": True,
                    }, headers=headers)
                    assert r.status_code == 201, r.text
                    repo = r.json()
                    repo_id = repo["id"]
                    assert repo["full_name"] == "Sugamchaturvedi/DevTrack-Demo"
                    assert repo["has_webhook_secret"] is True
                    assert repo["stars_count"] == 5
                    assert "webhook_secret_encrypted" not in repo

                # Webhook Signature Rejection (401)
                bad_body = json.dumps({"ref": "refs/heads/main", "commits": []}).encode("utf-8")
                r = await client.post(
                    f"/github/webhooks/{repo_id}",
                    content=bad_body,
                    headers={"X-GitHub-Event": "push", "X-Hub-Signature-256": "sha256=invalid"},
                )
                assert r.status_code == 401

                # Deliver Valid Push Webhook referencing DevTrack Issue Key
                push_payload = {
                    "ref": f"refs/heads/feat/{issue_key}-hmac",
                    "pusher": {"name": "devtrack-tester"},
                    "head_commit": {"id": "abcdef1234567890abcdef1234567890abcdef12"},
                    "commits": [
                        {
                            "id": "abcdef1234567890abcdef1234567890abcdef12",
                            "message": f"feat: implement webhook verification for {issue_key}",
                            "author": {"name": "Sugam", "email": "sugam@devtrack.edu"},
                            "url": "https://github.com/Sugamchaturvedi/DevTrack-Demo/commit/abcdef1",
                            "timestamp": "2026-11-25T10:00:00Z",
                        }
                    ],
                }
                push_bytes = json.dumps(push_payload).encode("utf-8")
                r = await client.post(
                    f"/github/webhooks/{repo_id}",
                    content=push_bytes,
                    headers={"X-GitHub-Event": "push", "X-Hub-Signature-256": _sign_webhook(webhook_secret, push_bytes)},
                )
                assert r.status_code == 200, r.text
                assert r.json()["commits_added"] == 1

                # Deliver PR & PR Review (APPROVED) Webhooks
                pr_payload = {
                    "action": "opened",
                    "pull_request": {
                        "number": 42,
                        "title": f"[{issue_key}] Add HMAC webhook verification",
                        "body": f"Implements {issue_key}",
                        "state": "open",
                        "merged": False,
                        "head": {"ref": f"feat/{issue_key}-hmac"},
                        "base": {"ref": "main"},
                        "user": {"login": "devtrack-tester"},
                        "html_url": "https://github.com/Sugamchaturvedi/DevTrack-Demo/pull/42",
                        "additions": 120,
                        "deletions": 10,
                        "changed_files": 3,
                    },
                }
                pr_bytes = json.dumps(pr_payload).encode("utf-8")
                r = await client.post(
                    f"/github/webhooks/{repo_id}",
                    content=pr_bytes,
                    headers={"X-GitHub-Event": "pull_request", "X-Hub-Signature-256": _sign_webhook(webhook_secret, pr_bytes)},
                )
                assert r.status_code == 200

                rev_payload = {
                    "action": "submitted",
                    "pull_request": {"number": 42, "html_url": "https://github.com/Sugamchaturvedi/DevTrack-Demo/pull/42"},
                    "review": {"state": "APPROVED", "user": {"login": "faculty-reviewer"}},
                }
                rev_bytes = json.dumps(rev_payload).encode("utf-8")
                r = await client.post(
                    f"/github/webhooks/{repo_id}",
                    content=rev_bytes,
                    headers={"X-GitHub-Event": "pull_request_review", "X-Hub-Signature-256": _sign_webhook(webhook_secret, rev_bytes)},
                )
                assert r.status_code == 200

                # Verify commits, PRs, branches, activity endpoints
                r = await client.get(f"/github/projects/{proj_id}/pulls", headers=headers)
                assert r.status_code == 200
                prs = r.json()
                assert len(prs) == 1
                assert prs[0]["review_status"] == "approved"
                assert prs[0]["issue_key"] == issue_key

                r = await client.get(f"/github/projects/{proj_id}/commits", headers=headers)
                assert r.status_code == 200
                assert r.json()[0]["issue_key"] == issue_key

                r = await client.get(f"/github/projects/{proj_id}/activity", headers=headers)
                assert r.status_code == 200
                assert len(r.json()) >= 3

                # ------------------------------------------------------------------
                # B. CI/CD & RELEASE MANAGEMENT (DEVOPS)
                # ------------------------------------------------------------------
                r = await client.get(f"/devops/projects/{proj_id}/environments", headers=headers)
                assert r.status_code == 200
                envs = r.json()
                env_names = {e["name"] for e in envs}
                assert {"Development", "Testing", "Production"}.issubset(env_names)
                prod_env_id = next(e["id"] for e in envs if e["name"] == "Production")

                # Deliver workflow_run failure webhook -> should create PipelineRun & Notification
                wr_payload = {
                    "workflow_run": {
                        "id": 99001,
                        "name": "Pytest CI",
                        "head_branch": "main",
                        "head_sha": "abcdef1234567890",
                        "display_title": "Run tests",
                        "status": "completed",
                        "conclusion": "failure",
                        "actor": {"login": "devtrack-tester"},
                        "html_url": "https://github.com/Sugamchaturvedi/DevTrack-Demo/actions/runs/99001",
                    }
                }
                wr_bytes = json.dumps(wr_payload).encode("utf-8")
                r = await client.post(
                    f"/github/webhooks/{repo_id}",
                    content=wr_bytes,
                    headers={"X-GitHub-Event": "workflow_run", "X-Hub-Signature-256": _sign_webhook(webhook_secret, wr_bytes)},
                )
                assert r.status_code == 200

                r = await client.get(f"/devops/projects/{proj_id}/pipelines", headers=headers)
                assert r.status_code == 200
                runs = r.json()
                assert len(runs) == 1
                assert runs[0]["build_status"] == "failure"

                # Create Release & Deployment record
                r = await client.post(f"/devops/projects/{proj_id}/releases", json={
                    "version": "v1.2.0",
                    "tag_name": "v1.2.0",
                    "title": "Sprint 1 Production Release",
                    "release_notes": "- Implemented GitHub integration",
                    "environment_id": prod_env_id,
                }, headers=headers)
                assert r.status_code == 201
                rel_id = r.json()["id"]

                r = await client.post(f"/devops/projects/{proj_id}/deployments", json={
                    "environment_id": prod_env_id,
                    "version": "v1.2.0",
                    "release_id": rel_id,
                    "status": "success",
                    "notes": "Verified production deployment",
                }, headers=headers)
                assert r.status_code == 201
                assert r.json()["status"] == "success"

                r = await client.get(f"/devops/projects/{proj_id}/overview", headers=headers)
                assert r.status_code == 200
                assert r.json()["latest_release"] == "v1.2.0"

                # ------------------------------------------------------------------
                # C. TEST CASE MANAGEMENT (QA)
                # ------------------------------------------------------------------
                r = await client.post(f"/qa/projects/{proj_id}/test-plans", json={
                    "name": "Security & Auth Test Plan",
                    "objective": "Verify webhook HMAC & OAuth security",
                }, headers=headers)
                assert r.status_code == 201
                plan_id = r.json()["id"]

                r = await client.post(f"/qa/projects/{proj_id}/test-cases", json={
                    "title": "Verify valid HMAC webhook succeeds",
                    "test_plan_id": plan_id,
                    "linked_task_id": issue_id,
                    "priority": "high",
                    "test_type": "security",
                    "steps": [{"step_no": 1, "action": "Send signed webhook", "expected": "200 OK"}],
                    "expected_result": "Webhook accepted and commit stored",
                }, headers=headers)
                assert r.status_code == 201

                r = await client.post(f"/qa/projects/{proj_id}/test-cases", json={
                    "title": "Verify invalid HMAC webhook returns 401",
                    "test_plan_id": plan_id,
                    "linked_task_id": issue_id,
                    "priority": "critical",
                    "test_type": "security",
                    "steps": [{"step_no": 1, "action": "Send tampered signature", "expected": "401 Unauthorized"}],
                    "expected_result": "401 Unauthorized returned",
                }, headers=headers)
                assert r.status_code == 201

                r = await client.post(f"/qa/projects/{proj_id}/test-runs", json={
                    "name": "Security Verification Run #1",
                    "test_plan_id": plan_id,
                    "environment_name": "Testing",
                    "build_version": "v1.2.0-rc1",
                }, headers=headers)
                assert r.status_code == 201
                test_run_id = r.json()["id"]
                assert r.json()["total_cases"] == 2

                r = await client.get(f"/qa/projects/{proj_id}/test-runs/{test_run_id}/executions", headers=headers)
                assert r.status_code == 200
                execs = r.json()
                assert len(execs) == 2

                r = await client.put(f"/qa/test-runs/{test_run_id}/executions/{execs[0]['id']}", json={
                    "status": "pass",
                    "actual_result": "200 OK received as expected",
                }, headers=headers)
                assert r.status_code == 200

                r = await client.put(f"/qa/test-runs/{test_run_id}/executions/{execs[1]['id']}", json={
                    "status": "fail",
                    "actual_result": "Server returned 500 instead of 401 on missing signature",
                }, headers=headers)
                assert r.status_code == 200

                r = await client.post(f"/qa/executions/{execs[1]['id']}/create-bug", headers=headers)
                assert r.status_code == 201, r.text
                assert r.json()["issue_key"] is not None

                r = await client.get(f"/qa/projects/{proj_id}/coverage", headers=headers)
                assert r.status_code == 200
                cov = r.json()
                assert cov["total_test_cases"] == 2
                assert cov["requirement_coverage_pct"] == 100.0
                assert cov["pass_rate_pct"] == 50.0
                assert cov["linked_defects_count"] == 1

                # Verify Issue Details surfaces GitHub Code Review + QA Test Cases
                r = await client.get(f"/pm/issues/{issue_key}", headers=headers)
                assert r.status_code == 200
                issue_detail = r.json()
                assert issue_detail["github"]["code_review_status"] == "approved"
                assert len(issue_detail["github"]["commits"]) >= 1
                assert len(issue_detail["github"]["pull_requests"]) >= 1
                assert len(issue_detail["test_cases"]) == 2

                # Verify RBAC isolation: unauthenticated and non-member student blocked
                r_unauth = await client.get(f"/github/projects/{proj_id}/repos")
                assert r_unauth.status_code in (401, 403)
                r_stu_login = await client.post("/auth/login", json={
                    "email": "student.priya@devtrack.edu",
                    "password": "DevTrack@123",
                })
                if r_stu_login.status_code == 200:
                    stu_headers = {"Authorization": f"Bearer {r_stu_login.json()['access_token']}"}
                    assert (await client.get(f"/github/projects/{proj_id}/repos", headers=stu_headers)).status_code == 403
                    assert (await client.get(f"/devops/projects/{proj_id}/pipelines", headers=stu_headers)).status_code == 403
                    assert (await client.get(f"/qa/projects/{proj_id}/test-cases", headers=stu_headers)).status_code == 403
            finally:
                await client.delete("/github/disconnect", headers=headers)
                await client.delete(f"/projects/{proj_id}", headers=headers)

    asyncio.run(run())
