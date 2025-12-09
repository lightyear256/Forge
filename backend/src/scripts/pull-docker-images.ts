#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const REQUIRED_IMAGES = [
  'python:3.11-alpine',
  'node:20-alpine',
  'frolvlad/alpine-gxx',
  'eclipse-temurin:17-alpine',
  'golang:1.21-alpine',
  'ruby:3.2-alpine',
  'rust:alpine'
];

async function checkDocker() {
  try {
    await execAsync('docker --version');
    console.log('Docker is installed');
  } catch (error) {
    console.error('Docker is not installed or not in PATH');
    process.exit(1);
  }

  try {
    await execAsync('docker ps');
    console.log('Docker daemon is running');
  } catch (error) {
    console.error(' Docker daemon is not running');
    console.error('   Please start Docker and try again');
    process.exit(1);
  }
}

async function pullImage(image:any) {
  try {
    const { stdout } = await execAsync(`docker images -q ${image}`);
    
    if (stdout.trim()) {
      console.log(` ${image} already exists`);
      return true;
    }

    console.log(`Pulling ${image}...`);
    await execAsync(`docker pull ${image}`, { 
      timeout: 300000, 
      maxBuffer: 10 * 1024 * 1024 
    });
    console.log(`Successfully pulled ${image}`);
    return true;
  } catch (error:any) {
    console.error(` Failed to pull ${image}:`, error.message);
    return false;
  }
}


async function main() {
  console.log(' Docker Image Pull Script');
  console.log('============================\n');

  await checkDocker();

  console.log(`\nPulling ${REQUIRED_IMAGES.length} required images...\n`);

  let successCount = 0;
  let failCount = 0;

  for (const image of REQUIRED_IMAGES) {
    const success = await pullImage(image);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('\n============================');
  console.log('Summary:');
  console.log(`Success: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total: ${REQUIRED_IMAGES.length}`);

  if (failCount > 0) {
    console.log('\n Some images failed to pull. Build will continue, but those languages may not work.');
    console.log('   You can manually pull failed images later with: docker pull <image-name>');
    process.exit(0);
  }

  console.log('\n All Docker images are ready!');
  process.exit(0);
}

main().catch(error => {
  console.error('Unexpected error:', error);
  process.exit(1);
});