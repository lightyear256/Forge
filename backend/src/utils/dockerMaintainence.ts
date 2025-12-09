import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);



export const dockerMaintenance = {
  
  async getDiskUsage() {
    try {
      const { stdout } = await execAsync('docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}\t{{.Reclaimable}}"');
      console.log('Docker Disk Usage:\n', stdout);
      return stdout;
    } catch (error) {
      console.error('Failed to get disk usage:', error);
      return null;
    }
  },

  
  async fullCleanup() {
    try {
      console.log('Starting full Docker cleanup...');
      
      await execAsync('docker ps -q --filter "name=exec-" | xargs -r docker stop', { timeout: 30000 }).catch(() => {});
      
      await execAsync('docker ps -aq --filter "name=exec-" | xargs -r docker rm -f', { timeout: 30000 }).catch(() => {});
      
      await execAsync('docker image prune -af --filter "until=24h"', { timeout: 30000 });
      
      await execAsync('docker container prune -f --filter "until=1h"', { timeout: 30000 });
      
      await execAsync('docker builder prune -af --filter "until=48h"', { timeout: 30000 });
      
      // await execAsync('docker volume prune -f', { timeout: 30000 });
      
      await execAsync('docker network prune -f', { timeout: 30000 });
      
      console.log('Full Docker cleanup completed');
      return true;
    } catch (error) {
      console.error('Full cleanup failed:', error);
      return false;
    }
  },

  
  async emergencyCleanup() {
    try {
      console.log('EMERGENCY CLEANUP INITIATED');
      
      await execAsync('docker kill $(docker ps -q --filter "name=exec-") 2>/dev/null || true', { timeout: 10000 });
      
      await execAsync('docker rm -f $(docker ps -aq --filter "name=exec-") 2>/dev/null || true', { timeout: 10000 });
      
      await execAsync('docker image prune -af', { timeout: 60000 });
      
      await execAsync('docker system prune -af --volumes', { timeout: 120000 });
      
      console.log('Emergency cleanup completed');
      return true;
    } catch (error) {
      console.error('Emergency cleanup failed:', error);
      return false;
    }
  },

  
  async checkHealth() {
    try {
      await execAsync('docker info', { timeout: 5000 });
      return { healthy: true, message: 'Docker is responsive' };
    } catch (error: any) {
      return { healthy: false, message: error.message };
    }
  },

  
  async getStuckContainers() {
    try {
      const { stdout: created } = await execAsync('docker ps -a --filter "name=exec-" --filter "status=created" --format "{{.Names}}"', { timeout: 5000 });
      const { stdout: exited } = await execAsync('docker ps -a --filter "name=exec-" --filter "status=exited" --format "{{.Names}}"', { timeout: 5000 });
      
      const createdList = created.trim().split('\n').filter(n => n);
      const exitedList = exited.trim().split('\n').filter(n => n);
      
      return {
        created: createdList,
        exited: exitedList,
        total: createdList.length + exitedList.length
      };
    } catch (error) {
      console.error('Failed to get stuck containers:', error);
      return { created: [], exited: [], total: 0 };
    }
  },

  
  async logStats() {
    try {
      const { stdout: containerCount } = await execAsync('docker ps -q | wc -l');
      const { stdout: imageCount } = await execAsync('docker images -q | wc -l');
      const { stdout: volumeCount } = await execAsync('docker volume ls -q | wc -l');
      
      console.log('Docker Stats:', {
        runningContainers: containerCount.trim(),
        totalImages: imageCount.trim(),
        volumes: volumeCount.trim()
      });
      
      return {
        containers: parseInt(containerCount.trim()),
        images: parseInt(imageCount.trim()),
        volumes: parseInt(volumeCount.trim())
      };
    } catch (error) {
      console.error('Failed to get stats:', error);
      return null;
    }
  },

  
  async restartDocker() {
    try {
      console.log(' Attempting to restart Docker daemon...');
      await execAsync('systemctl restart docker', { timeout: 30000 });
      console.log(' Docker daemon restarted');
      return true;
    } catch (error) {
      console.error(' Failed to restart Docker (may need sudo):', error);
      return false;
    }
  }
};


export const setupDockerMonitoring = () => {
  setInterval(async () => {
    await dockerMaintenance.logStats();
    await dockerMaintenance.getDiskUsage();
  }, 300000);

  setInterval(async () => {
    const stuck = await dockerMaintenance.getStuckContainers();
    if (stuck.total > 0) {
      console.log(`Found ${stuck.total} stuck containers`);
      if (stuck.total > 10) {
        console.log('Auto-cleaning stuck containers...');
        await dockerMaintenance.fullCleanup();
      }
    }
  }, 120000);

  console.log('Docker monitoring enabled');
};