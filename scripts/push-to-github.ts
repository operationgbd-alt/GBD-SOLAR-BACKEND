import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

const REPO_OWNER = 'operationgbd-alt';
const REPO_NAME = 'GBD-SOLAR-BACKEND';
const BRANCH = 'main';

async function getAccessToken() {
  if (connectionSettings && connectionSettings.settings.expires_at && new Date(connectionSettings.settings.expires_at).getTime() > Date.now()) {
    return connectionSettings.settings.access_token;
  }
  
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY 
    ? 'repl ' + process.env.REPL_IDENTITY 
    : process.env.WEB_REPL_RENEWAL 
    ? 'depl ' + process.env.WEB_REPL_RENEWAL 
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=github',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  const accessToken = connectionSettings?.settings?.access_token || connectionSettings.settings?.oauth?.credentials?.access_token;

  if (!connectionSettings || !accessToken) {
    throw new Error('GitHub not connected');
  }
  return accessToken;
}

async function getGitHubClient() {
  const accessToken = await getAccessToken();
  return new Octokit({ auth: accessToken });
}

function getAllFiles(dirPath: string, basePath: string = ''): { path: string; content: string }[] {
  const files: { path: string; content: string }[] = [];
  const items = fs.readdirSync(dirPath);

  for (const item of items) {
    if (item === 'node_modules' || item === '.git' || item === 'dist') continue;
    
    const fullPath = path.join(dirPath, item);
    const relativePath = basePath ? `${basePath}/${item}` : item;
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      files.push(...getAllFiles(fullPath, relativePath));
    } else {
      const content = fs.readFileSync(fullPath, 'utf-8');
      files.push({ path: relativePath, content });
    }
  }

  return files;
}

async function main() {
  console.log('=== Push Backend su GitHub ===\n');
  
  try {
    const octokit = await getGitHubClient();
    console.log('Connesso a GitHub');

    const { data: refData } = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BRANCH}`
    });
    const latestCommitSha = refData.object.sha;
    console.log(`Ultimo commit: ${latestCommitSha.substring(0, 7)}`);

    const { data: commitData } = await octokit.git.getCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      commit_sha: latestCommitSha
    });
    const baseTreeSha = commitData.tree.sha;

    const backendDir = path.join(__dirname, '..');
    const files = getAllFiles(backendDir);
    console.log(`Trovati ${files.length} file da caricare`);

    const treeItems = await Promise.all(
      files.map(async (file) => {
        const { data: blob } = await octokit.git.createBlob({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          content: Buffer.from(file.content).toString('base64'),
          encoding: 'base64'
        });
        return {
          path: file.path,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha
        };
      })
    );

    const { data: newTree } = await octokit.git.createTree({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      tree: treeItems,
      base_tree: baseTreeSha
    });
    console.log(`Nuovo tree creato: ${newTree.sha.substring(0, 7)}`);

    const { data: newCommit } = await octokit.git.createCommit({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      message: 'Fix: corretta autorizzazione tecnici con confronto tipi String()',
      tree: newTree.sha,
      parents: [latestCommitSha]
    });
    console.log(`Nuovo commit creato: ${newCommit.sha.substring(0, 7)}`);

    await octokit.git.updateRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BRANCH}`,
      sha: newCommit.sha
    });

    console.log('\n=== PUSH COMPLETATO ===');
    console.log(`Commit: ${newCommit.sha}`);
    console.log(`Repository: https://github.com/${REPO_OWNER}/${REPO_NAME}`);
    console.log('\nRailway farà il deploy automaticamente!');
    
  } catch (error: any) {
    console.error('Errore:', error.message);
    if (error.status === 404) {
      console.error('Repository non trovato o permessi insufficienti');
    }
  }
}

main();
