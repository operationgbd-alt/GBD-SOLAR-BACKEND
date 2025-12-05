import { Octokit } from '@octokit/rest';
import * as fs from 'fs';
import * as path from 'path';

let connectionSettings: any;

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

async function createRepository(repoName: string, isPrivate: boolean = false) {
  const octokit = await getGitHubClient();
  
  try {
    const { data: user } = await octokit.users.getAuthenticated();
    console.log(`Utente GitHub: ${user.login}`);

    const { data: repo } = await octokit.repos.createForAuthenticatedUser({
      name: repoName,
      description: 'SolarTech Backend API - Gestione Interventi Fotovoltaici',
      private: isPrivate,
      auto_init: false
    });

    console.log(`Repository creato: ${repo.html_url}`);
    return repo;
  } catch (error: any) {
    if (error.status === 422) {
      console.log('Repository già esistente, recupero info...');
      const { data: user } = await octokit.users.getAuthenticated();
      const { data: repo } = await octokit.repos.get({
        owner: user.login,
        repo: repoName
      });
      return repo;
    }
    throw error;
  }
}

async function main() {
  const repoName = process.argv[2] || 'solartech-backend';
  const isPrivate = process.argv[3] === 'private';

  console.log(`\nCreazione repository: ${repoName}`);
  console.log(`Visibilità: ${isPrivate ? 'Privato' : 'Pubblico'}\n`);

  try {
    const repo = await createRepository(repoName, isPrivate);
    
    console.log('\n=== ISTRUZIONI ===');
    console.log(`\n1. Nel terminale, vai nella cartella backend:`);
    console.log(`   cd backend`);
    console.log(`\n2. Inizializza git e fai il push:`);
    console.log(`   git init`);
    console.log(`   git add .`);
    console.log(`   git commit -m "Initial commit"`);
    console.log(`   git branch -M main`);
    console.log(`   git remote add origin ${repo.clone_url}`);
    console.log(`   git push -u origin main`);
    console.log(`\n3. Vai su Railway (railway.app) e:`);
    console.log(`   - Crea nuovo progetto`);
    console.log(`   - Aggiungi PostgreSQL`);
    console.log(`   - Collega il repository GitHub: ${repo.html_url}`);
    console.log(`   - Imposta variabili ambiente: JWT_SECRET, NODE_ENV=production`);
    console.log(`\nRepository: ${repo.html_url}`);
  } catch (error) {
    console.error('Errore:', error);
  }
}

main();
