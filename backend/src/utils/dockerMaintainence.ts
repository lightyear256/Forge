import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

export const dockerMaintenance = {
  
  async getDiskUsage() {
    try {
      const { stdout } = await execAsync('docker system df --format "table {{.Type}}\t{{.TotalCount}}\t{{.Size}}\t{{.Reclaimable}}"');
      console.log('💾 Docker Disk Usage:\n', stdout);
      return stdout;
    } catch (error) {
      console.error('Failed to get disk usage:', error);
      return null;
    }
  },

  async fullCleanup() {
    try {
      console.log('🧹 Starting full Docker cleanup...');
      
      // Kill and remove exec containers
      await execAsync('docker ps -q --filter "name=exec-" | xargs -r docker kill -s SIGKILL', { timeout: 30000 }).catch(() => {});
      await new Promise(resolve => setTimeout(resolve, 2000));
      await execAsync('docker ps -aq --filter "name=exec-" | xargs -r docker rm -f', { timeout: 30000 }).catch(() => {});
      
      // IMPORTANT: Only remove dangling images (preserves language runtimes)
      await execAsync('docker image prune -f', { timeout: 30000 });
      
      // Clean old containers (not exec- ones, those are handled above)
      await execAsync('docker container prune -f --filter "until=1h"', { timeout: 30000 });
      
      // Clean build cache
      await execAsync('docker builder prune -f --filter "until=24h"', { timeout: 30000 });
      
      // Clean networks
      await execAsync('docker network prune -f', { timeout: 30000 });
      
      console.log('✅ Full cleanup completed');
      return true;
    } catch (error) {
      console.error('❌ Cleanup failed:', error);
      return false;
    }
  },

  async emergencyCleanup() {
    try {
      console.log('🚨 EMERGENCY CLEANUP');
      
      // Force kill all exec containers
      await execAsync('docker kill $(docker ps -q --filter "name=exec-") 2>/dev/null || true', { timeout: 10000 });
      await new Promise(resolve => setTimeout(resolve, 2000));
      await execAsync('docker rm -f $(docker ps -aq --filter "name=exec-") 2>/dev/null || true', { timeout: 10000 });
      
      // Remove dangling images only
      await execAsync('docker image prune -f', { timeout: 60000 });
      
      // Container and network cleanup
      await execAsync('docker container prune -f', { timeout: 60000 });
      await execAsync('docker network prune -f', { timeout: 30000 });
      
      console.log('✅ Emergency cleanup completed');
      return true;
    } catch (error) {
      console.error('❌ Emergency cleanup failed:', error);
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
      const { stdout } = await execAsync('docker ps -a --filter "name=exec-" --format "{{.Names}}\t{{.Status}}"', { timeout: 5000 });
      
      const containers = stdout.trim().split('\n').filter(n => n);
      const stuck = containers.filter(c => {
        const status = c.split('\t')[1] as any;
        return status.includes('Created') || status.includes('Exited');
      });
      
      return {
        all: containers.map(c => c.split('\t')[0]),
        stuck: stuck.map(c => c.split('\t')[0]),
        total: stuck.length
      };
    } catch (error) {
      return { all: [], stuck: [], total: 0 };
    }
  },

  async logStats() {
    try {
      const { stdout: containerCount } = await execAsync('docker ps -q | wc -l');
      const { stdout: execCount } = await execAsync('docker ps -q --filter "name=exec-" | wc -l');
      const { stdout: imageCount } = await execAsync('docker images -q | wc -l');
      
      const stats = {
        total: parseInt(containerCount.trim()),
        exec: parseInt(execCount.trim()),
        images: parseInt(imageCount.trim())
      };
      
      console.log('📊 Docker Stats:', stats);
      return stats;
    } catch (error) {
      return null;
    }
  },

  async getMemoryUsage() {
    try {
      const { stdout } = await execAsync("free -m | grep Mem | awk '{print $3, $2, ($3/$2)*100}'");
      const [used, total, percent] = stdout.trim().split(' ').map(parseFloat) as any ;
      
      console.log(`💾 System Memory: ${used}MB / ${total}MB (${percent.toFixed(1)}%)`);
      return { used, total, percent };
    } catch (error) {
      return null;
    }
  }
};

export const setupDockerMonitoring = () => {
  // Stats every 5 minutes
  setInterval(async () => {
    await dockerMaintenance.logStats();
    await dockerMaintenance.getMemoryUsage();
    await dockerMaintenance.getDiskUsage();
  }, 300000);

  // Check for stuck containers every 2 minutes
  setInterval(async () => {
    const stuck = await dockerMaintenance.getStuckContainers();
    if (stuck.total > 5) {
      console.log(`⚠️ Found ${stuck.total} stuck containers - cleaning...`);
      await dockerMaintenance.fullCleanup();
    }
  }, 120000);

  // CRITICAL: Proactive memory monitoring for t3.micro
  setInterval(async () => {
    const memory = await dockerMaintenance.getMemoryUsage();
    if (memory && memory.percent > 75) {
      console.warn(`⚠️ Memory usage at ${memory.percent.toFixed(1)}% - aggressive cleanup...`);
      await dockerMaintenance.emergencyCleanup();
      
      // Force system cache drop (dangerous but necessary for t3.micro)
      try {
        const { exec } = require('child_process');
        const { promisify } = require('util');
        const execAsync = promisify(exec);
        await execAsync('sync && echo 3 > /proc/sys/vm/drop_caches').catch(() => {});
      } catch (e) {}
    }
  }, 60000); // Check every minute

  console.log('✅ Docker monitoring enabled (aggressive for t3.micro)');
};