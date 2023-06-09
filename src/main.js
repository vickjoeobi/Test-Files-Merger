const fs = require('fs');
const path = require('path');
const { Octokit } = require('@octokit/rest');

async function run() {
  try {
    const token = process.env.INPUT_TOKEN;
    const octokit = new Octokit({ auth: `token ${token}` });

    const repo = process.env.GITHUB_REPOSITORY;
    const [owner, repoName] = repo.split('/');

    // 1. Read repositoryname.json
    const repositoryJsonPath = path.join(process.env.GITHUB_WORKSPACE, `${repoName}.json`);
    if (!fs.existsSync(repositoryJsonPath)) {
      throw new Error(`File ${repositoryJsonPath} not found. Make sure it exists in your repository root directory.`);
    }
    const repositoryJson = JSON.parse(fs.readFileSync(repositoryJsonPath, 'utf8'));

    // 2. Get the last commit from vickjoeobi/testFiles
    const { data: testFilesCommits } = await octokit.repos.listCommits({
      owner: 'vickjoeobi',
      repo: 'testFiles',
      per_page: 1,
    });
    if (testFilesCommits.length === 0) {
      throw new Error('No commits found in vickjoeobi/testFiles. Make sure the repository exists and has at least one commit.');
    }
    const lastCommitSha = testFilesCommits[0].sha;

    // 3. Get orchestrator.json from the last commit
    const { data: orchestratorJsonContent } = await octokit.repos.getContent({
      owner: 'vickjoeobi',
      repo: 'testFiles',
      path: 'orchestrator.json',
      ref: lastCommitSha,
    });
    if (!orchestratorJsonContent.content) {
      throw new Error(`File orchestrator.json not found in commit ${lastCommitSha}. Make sure the file exists in the repository and is part of the commit.`);
    }
    const orchestratorJson = JSON.parse(
      Buffer.from(orchestratorJsonContent.content, 'base64').toString('utf8')
    );

    // 4. Merge the two JSON files
    const mergedJson = { ...repositoryJson, ...orchestratorJson };
    const mergedJsonPath = path.join(process.env.GITHUB_WORKSPACE, `${repoName}TestFile.json`);
    fs.writeFileSync(mergedJsonPath, JSON.stringify(mergedJson, null, 2));

    // 5. Commit the merged JSON file
    const base64MergedJson = Buffer.from(JSON.stringify(mergedJson, null, 2)).toString('base64');
    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo: repoName,
      path: `${repoName}TestFile.json`,
      message: `Added test file from ${repoName}`,
      content: base64MergedJson,
    });

    // 6. Log success message
    console.log(`Successfully committed ${repoName}TestFile.json`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

run();
