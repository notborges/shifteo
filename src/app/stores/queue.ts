import { defineStore } from 'pinia'
import type { Job, JobStatus } from '@/workers/types'
import { generateFileId } from '@/utils/file'
import { removeQueueJob as removeFromIDB, clearAllTempFiles } from '@/utils/idb'

interface QueueState {
  jobs: Job[]
}

export const useQueueStore = defineStore('queue', {
  state: (): QueueState => ({
    jobs: []
  }),

  getters: {
    activeJobs: (state) => state.jobs.filter(j => j.status === 'running'),
    completedJobs: (state) => state.jobs.filter(j => j.status === 'completed'),
    errorJobs: (state) => state.jobs.filter(j => j.status === 'error'),
    pendingJobs: (state) => state.jobs.filter(j => j.status === 'idle'),

    totalJobs: (state) => state.jobs.length,
    hasActiveJobs: (state) => state.jobs.some(j => j.status === 'running'),

    getJobById: (state) => (id: string) => state.jobs.find(j => j.id === id)
  },

  actions: {
    addJob(job: Omit<Job, 'id' | 'createdAt' | 'progress'>) {
      const newJob: Job = {
        ...job,
        id: generateFileId(),
        createdAt: Date.now(),
        progress: 0
      }
      this.jobs.push(newJob)
      return newJob.id
    },

    updateJob(id: string, updates: Partial<Job>) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        Object.assign(job, updates)
      }
    },

    updateJobStatus(id: string, status: JobStatus) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        job.status = status
        if (status === 'completed' || status === 'error') {
          job.completedAt = Date.now()
        }
      }
    },

    updateJobProgress(id: string, progress: number) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        job.progress = Math.min(1, Math.max(0, progress))
      }
    },

    updateJobStage(id: string, stage: string) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        job.stage = stage
      }
    },

    setJobError(id: string, error: string) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        job.status = 'error'
        job.error = error
        job.completedAt = Date.now()
      }
    },

    setJobResult(id: string, result: Blob | Blob[]) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        job.result = result
        job.status = 'completed'
        job.progress = 1
        job.completedAt = Date.now()
      }
    },

    async removeJob(id: string) {
      const job = this.jobs.find(j => j.id === id)
      if (job?.thumbnail) {
        try {
          URL.revokeObjectURL(job.thumbnail)
        } catch (e) {
          console.warn('Failed to revoke thumbnail URL:', e)
        }
      }
      const index = this.jobs.findIndex(j => j.id === id)
      if (index !== -1) {
        this.jobs.splice(index, 1)
      }

      // Remove from IndexedDB
      await removeFromIDB(id)
    },

    async clearCompleted() {
      const completedIds = this.jobs.filter(j => j.status === 'completed').map(j => j.id)

      this.jobs.filter(j => j.status === 'completed').forEach(j => {
        if (j.thumbnail) {
          try {
            URL.revokeObjectURL(j.thumbnail)
          } catch (e) {}
        }
      })
      this.jobs = this.jobs.filter(j => j.status !== 'completed')

      // Remove from IndexedDB
      for (const id of completedIds) {
        await removeFromIDB(id)
      }
    },

    async clearAll() {
      this.jobs.forEach(j => {
        if (j.thumbnail) {
          try {
            URL.revokeObjectURL(j.thumbnail)
          } catch (e) {}
        }
      })
      this.jobs = []

      // Clear all from IndexedDB
      await clearAllTempFiles()
    },

    retryJob(id: string) {
      const job = this.jobs.find(j => j.id === id)
      if (job) {
        job.status = 'idle'
        job.progress = 0
        job.error = undefined
        job.result = undefined
        job.completedAt = undefined
      }
    }
  }
})
